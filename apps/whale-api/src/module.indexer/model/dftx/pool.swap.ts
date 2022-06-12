import { DfTxIndexer, DfTxTransaction } from './_abstract'
import { CPoolSwap, PoolSwap } from '@defichain/jellyfish-transaction'
import { RawBlock } from '../_abstract'
import { Inject, Injectable } from '@nestjs/common'
import { NetworkName } from '@defichain/jellyfish-network'
import { IndexerError } from '../../error'
import BigNumber from 'bignumber.js'
import { PoolSwapMapper } from '../../../module.model/pool.swap'
import { HexEncoder } from '../../../module.model/_hex.encoder'
import { PoolSwapAggregatedMapper } from '../../../module.model/pool.swap.aggregated'
import { AggregatedIntervals } from './pool.swap.aggregated'
import { DeFiDCache, PoolPairInfoWithId } from '../../../module.api/cache/defid.cache'
import { NotFoundApiException } from '../../../module.api/_core/api.error'

@Injectable()
export class PoolSwapIndexer extends DfTxIndexer<PoolSwap> {
  OP_CODE: number = CPoolSwap.OP_CODE

  constructor (
    private readonly poolSwapMapper: PoolSwapMapper,
    private readonly aggregatedMapper: PoolSwapAggregatedMapper,
    private readonly deFiDCache: DeFiDCache,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<PoolSwap>): Promise<void> {
    const data = transaction.dftx.data
    const poolPair = await this.getPair(data.fromTokenId, data.toTokenId)
    await this.indexSwap(block, transaction, poolPair.id, data.fromTokenId, data.fromAmount)
  }

  async indexSwap (block: RawBlock, transaction: DfTxTransaction<any>, poolPairId: string, fromTokenId: number, fromAmount: BigNumber): Promise<void> {
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
      const aggregate = previous[0]
      const amount = new BigNumber(aggregate.aggregated.amounts[`${fromTokenId}`] ?? '0')

      aggregate.aggregated.amounts[`${fromTokenId}`] = amount.plus(fromAmount).toFixed(8)
      await this.aggregatedMapper.put(aggregate)
    }
  }

  async invalidateTransaction (_: RawBlock, transaction: DfTxTransaction<PoolSwap>): Promise<void> {
    const data = transaction.dftx.data
    const poolPair = await this.getPair(data.fromTokenId, data.toTokenId)
    await this.invalidateSwap(transaction, poolPair.id, data.fromTokenId, data.fromAmount)
  }

  async invalidateSwap (transaction: DfTxTransaction<any>, poolPairId: string, fromTokenId: number, fromAmount: BigNumber): Promise<void> {
    await this.poolSwapMapper.delete(`${poolPairId}-${transaction.txn.txid}`)

    for (const interval of AggregatedIntervals) {
      const previous = await this.aggregatedMapper.query(`${poolPairId}-${interval as number}`, 1)
      const aggregate = previous[0]
      const amount = new BigNumber(aggregate.aggregated.amounts[`${fromTokenId}`])

      aggregate.aggregated.amounts[`${fromTokenId}`] = amount.minus(fromAmount).toFixed(8)
      await this.aggregatedMapper.put(aggregate)
    }
  }

  async getPair (tokenA: number, tokenB: number): Promise<PoolPairInfoWithId> {
    const a = await this.deFiDCache.getTokenInfo(`${tokenA}`)
    if (a === undefined) {
      throw new NotFoundApiException('Unable to find fromToken')
    }

    const b = await this.deFiDCache.getTokenInfo(`${tokenB}`)
    if (b === undefined) {
      throw new NotFoundApiException('Unable to find toToken')
    }

    let poolPair = await this.deFiDCache.getPoolPairInfo(`${a.symbol}-${b.symbol}`)
    if (poolPair === undefined) {
      poolPair = await this.deFiDCache.getPoolPairInfo(`${b.symbol}-${a.symbol}`)
    }
    if (poolPair === undefined) {
      throw new IndexerError(`Pool for pair ${tokenA}, ${tokenB} not found`)
    }

    return poolPair
  }
}
