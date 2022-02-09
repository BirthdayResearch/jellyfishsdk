import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { CCompositeSwap, CompositeSwap, PoolId, PoolSwap } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Inject, Injectable } from '@nestjs/common'
import { PoolSwapIndexer } from './pool.swap'
import { PoolPairHistoryMapper } from '@src/module.model/pool.pair.history'
import { PoolPairTokenMapper } from '@src/module.model/pool.pair.token'
import { NetworkName } from '@defichain/jellyfish-network'
import { IndexerError } from '@src/module.indexer/error'
import BigNumber from 'bignumber.js'

const ONE = new BigNumber(1.0)

@Injectable()
export class CompositeSwapIndexer extends DfTxIndexer<CompositeSwap> {
  OP_CODE: number = CCompositeSwap.OP_CODE

  constructor (
    private readonly poolPairHistoryMapper: PoolPairHistoryMapper,
    private readonly poolPairTokenMapper: PoolPairTokenMapper,
    private readonly poolSwapIndexer: PoolSwapIndexer,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<CompositeSwap>): Promise<void> {
    const data = transaction.dftx.data
    const poolSwap = data.poolSwap
    const poolIds = data.pools.length > 0
      ? data.pools
      : await this.getPoolIdsForTokens(poolSwap.fromTokenId, poolSwap.toTokenId)

    await this.indexSwaps(poolIds, poolSwap, transaction, block)
  }

  async indexSwaps (poolIds: PoolId[], poolSwap: PoolSwap, transaction: DfTxTransaction<CompositeSwap>, block: RawBlock): Promise<void> {
    let fromAmount: BigNumber = poolSwap.fromAmount

    for (const pool of poolIds) {
      // TODO(fuxingloh): we need to cache this too
      const poolPair = await this.poolPairHistoryMapper.getLatest(`${pool.id}`)
      if (poolPair === undefined) {
        throw new IndexerError(`Pool with id ${pool.id} not found`)
      }

      await this.poolSwapIndexer.indexSwap(block, transaction, poolPair.poolPairId, poolSwap.fromTokenId, poolSwap.fromAmount)
      fromAmount = ONE.minus(poolPair.commission).times(fromAmount)
    }
  }

  async getPoolIdsForTokens (fromTokenId: number, toTokenId: number): Promise<PoolId[]> {
    const poolPairToken = await this.poolPairTokenMapper.getPair(fromTokenId, toTokenId)
    if (poolPairToken === undefined) {
      throw new IndexerError(`Pool for pair ${fromTokenId}, ${toTokenId} not found`)
    }

    return [{ id: poolPairToken.poolPairId }]
  }

  async invalidateTransaction (_: RawBlock, transaction: DfTxTransaction<CompositeSwap>): Promise<void> {
    const data = transaction.dftx.data
    const poolSwap = data.poolSwap
    const poolIds = [...data.pools]

    if (poolIds.length === 0) {
      const poolPair = await this.poolSwapIndexer.getPair(poolSwap.fromTokenId, poolSwap.toTokenId)
      poolIds.push({ id: poolPair.poolPairId })
    }

    for (const pool of poolIds) {
      await this.poolSwapIndexer.invalidateSwap(`${pool.id}`, transaction.txn.txid)
    }
  }
}
