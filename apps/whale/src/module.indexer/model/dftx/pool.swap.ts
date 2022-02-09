import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { CPoolSwap, PoolSwap } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Inject, Injectable } from '@nestjs/common'
import { PoolPairHistoryMapper } from '@src/module.model/pool.pair.history'
import { PoolPairToken, PoolPairTokenMapper } from '@src/module.model/pool.pair.token'
import { NetworkName } from '@defichain/jellyfish-network'
import { IndexerError } from '@src/module.indexer/error'
import BigNumber from 'bignumber.js'
import { PoolSwapMapper } from '@src/module.model/pool.swap'
import { HexEncoder } from '@src/module.model/_hex.encoder'

@Injectable()
export class PoolSwapIndexer extends DfTxIndexer<PoolSwap> {
  OP_CODE: number = CPoolSwap.OP_CODE

  constructor (
    private readonly poolPairHistoryMapper: PoolPairHistoryMapper,
    private readonly poolPairTokenMapper: PoolPairTokenMapper,
    private readonly poolSwapMapper: PoolSwapMapper,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<PoolSwap>): Promise<void> {
    const data = transaction.dftx.data
    const poolPair = await this.getPair(data.fromTokenId, data.toTokenId)
    await this.indexSwap(block, transaction, `${poolPair.poolPairId}`, data.fromTokenId, data.fromAmount)
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
  }

  async invalidateTransaction (_: RawBlock, transaction: DfTxTransaction<PoolSwap>): Promise<void> {
    const data = transaction.dftx.data
    const poolPair = await this.getPair(data.fromTokenId, data.toTokenId)
    await this.invalidateSwap(`${poolPair.poolPairId}`, transaction.txn.txid)
  }

  async invalidateSwap (poolPairId: string, txid: string): Promise<void> {
    await this.poolSwapMapper.delete(`${poolPairId}-${txid}`)
  }

  async getPair (tokenA: number, tokenB: number): Promise<PoolPairToken> {
    // TODO(fuxingloh): caching

    const poolPairToken = await this.poolPairTokenMapper.getPair(tokenA, tokenB)
    if (poolPairToken === undefined) {
      throw new IndexerError(`Pool for pair ${tokenA}, ${tokenB} not found`)
    }

    return poolPairToken
  }
}
