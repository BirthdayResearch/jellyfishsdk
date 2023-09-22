import { DfTxIndexer, DfTxTransaction } from './_abstract'
import { CPoolSwap, PoolSwap } from '@defichain/jellyfish-transaction'
import { RawBlock } from '../_abstract'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { NetworkName } from '@defichain/jellyfish-network'
import BigNumber from 'bignumber.js'
import { PoolSwapMapper } from '../../../module.model/pool.swap'
import { HexEncoder } from '../../../module.model/_hex.encoder'
import { PoolSwapAggregatedMapper } from '../../../module.model/pool.swap.aggregated'
import { AggregatedIntervals } from './pool.swap.aggregated'
import { PoolPairInfoWithId } from '../../../module.api/cache/defid.cache'
import { IndexerError } from '../../error'
import { PoolPairPathMapping } from './pool.pair.path.mapping'

@Injectable()
export class PoolSwapIndexer extends DfTxIndexer<PoolSwap> {
  OP_CODE: number = CPoolSwap.OP_CODE
  private readonly logger = new Logger(PoolSwapIndexer.name)

  constructor (
    private readonly poolSwapMapper: PoolSwapMapper,
    private readonly aggregatedMapper: PoolSwapAggregatedMapper,
    private readonly poolPairPathMapping: PoolPairPathMapping,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<PoolSwap>): Promise<void> {
    this.logger.log(`[Pool.Swap] Index Transaction starting at block hash: ${block.hash} - height: ${block.height} - transaction: ${JSON.stringify(transaction)}`)
    const data = transaction.dftx.data
    const poolPair = await this.getPair(data.fromTokenId, data.toTokenId)
    await this.indexSwap(block, transaction, poolPair.id, data.fromTokenId, data.fromAmount)
    this.logger.log(`[Pool.Swap] Index Transaction ended for block hash: ${block.hash} - height: ${block.height}`)
  }

  async indexSwap (block: RawBlock, transaction: DfTxTransaction<any>, poolPairId: string, fromTokenId: number, fromAmount: BigNumber): Promise<void> {
    this.logger.log(`[Pool.Swap] Invalidate Swap starting for transaction: ${JSON.stringify(transaction)} - poolPairId: ${poolPairId} - fromTokenId: ${fromTokenId} - fromAmount: ${fromAmount.toString()}`)
    await this.poolSwapMapper.put({
      id: `${poolPairId}-${transaction.txn.txid}`,
      txid: transaction.txn.txid,
      txno: transaction.txnNo,
      poolPairId: poolPairId,
      sort: HexEncoder.encodeHeight(block.height) + HexEncoder.encodeHeight(transaction.txnNo),
      fromAmount: fromAmount.toFixed(8),
      fromTokenId: fromTokenId,
      block: {
        hash: block.hash,
        height: block.height,
        time: block.time,
        medianTime: block.mediantime
      }
    })

    for (const interval of AggregatedIntervals) {
      const previous = await this.aggregatedMapper.query(`${poolPairId}-${interval}`, 1)
      if (previous.length === 0) {
        // Logger Error instead of panic exiting to prevent cascade failure
        this.logger.error(`indexSwap ${transaction.txn.txid}: Unable to find ${poolPairId}-${interval} for Aggregate Indexing`)
        continue
      }
      const aggregate = previous[0]
      const amount = new BigNumber(aggregate.aggregated.amounts[`${fromTokenId}`] ?? '0')

      aggregate.aggregated.amounts[`${fromTokenId}`] = amount.plus(fromAmount).toFixed(8)
      await this.aggregatedMapper.put(aggregate)
    }
    this.logger.log(`[Pool.Swap] Invalidate Swap ended for transaction: ${JSON.stringify(transaction)} - poolPairId: ${poolPairId} - fromTokenId: ${fromTokenId} - fromAmount: ${fromAmount.toString()}`)
  }

  async invalidateTransaction (_: RawBlock, transaction: DfTxTransaction<PoolSwap>): Promise<void> {
    this.logger.log(`[Pool.Swap] Invalidate Transaction starting at block hash: ${_.hash} - height: ${_.height} - transaction: ${JSON.stringify(transaction)}`)
    const data = transaction.dftx.data
    const poolPair = await this.getPair(data.fromTokenId, data.toTokenId)
    await this.invalidateSwap(transaction, poolPair.id, data.fromTokenId, data.fromAmount)
    this.logger.log(`[Pool.Swap] Invalidate Transaction ended for block hash: ${_.hash} - height: ${_.height} - txid: ${transaction.txn.txid} - poolPair: ${JSON.stringify(poolPair)}`)
  }

  async invalidateSwap (transaction: DfTxTransaction<any>, poolPairId: string, fromTokenId: number, fromAmount: BigNumber): Promise<void> {
    this.logger.log(`[Pool.Swap] Invalidate Swap starting for transaction: ${JSON.stringify(transaction)} - poolPairId: ${poolPairId} - fromTokenId: ${fromTokenId} - fromAmount: ${fromAmount.toString()}`)
    await this.poolSwapMapper.delete(`${poolPairId}-${transaction.txn.txid}`)

    for (const interval of AggregatedIntervals) {
      const previous = await this.aggregatedMapper.query(`${poolPairId}-${interval as number}`, 1)
      if (previous.length === 0) {
        // Logger Error instead of panic exiting to prevent cascade failure
        this.logger.error(`invalidateSwap ${transaction.txn.txid}: Unable to find ${poolPairId}-${interval} for Aggregate Indexing`)
        continue
      }
      const aggregate = previous[0]
      const amount = new BigNumber(aggregate.aggregated.amounts[`${fromTokenId}`])

      aggregate.aggregated.amounts[`${fromTokenId}`] = amount.minus(fromAmount).toFixed(8)
      await this.aggregatedMapper.put(aggregate)
    }
    this.logger.log(`[Pool.Swap] Invalidate Swap ended for transaction: ${JSON.stringify(transaction)} - poolPairId: ${poolPairId} - fromTokenId: ${fromTokenId} - fromAmount: ${fromAmount.toString()}`)
  }

  async getPair (tokenA: number, tokenB: number): Promise<PoolPairInfoWithId> {
    const pair = await this.poolPairPathMapping.findPair(tokenA, tokenB)
    this.logger.log(`[Pool.Swap] GetPair - pair: ${JSON.stringify(pair)}`)
    if (pair !== undefined) {
      return pair
    }

    throw new IndexerError(`Pool for pair ${tokenA}, ${tokenB} not found in PoolPairPathMapping`)
  }
}
