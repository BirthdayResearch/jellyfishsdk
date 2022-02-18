import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { CCompositeSwap, CompositeSwap, PoolId } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Inject, Injectable } from '@nestjs/common'
import { PoolSwapIndexer } from './pool.swap'
import { PoolPairHistory, PoolPairHistoryMapper } from '@src/module.model/pool.pair.history'
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
    const poolIds = await this.getPoolIdsForTokens(data)

    let fromAmount: BigNumber = poolSwap.fromAmount

    for (const pool of poolIds) {
      const poolPair = await this.getPoolPair(pool.id)
      await this.poolSwapIndexer.indexSwap(block, transaction, poolPair.poolPairId, poolSwap.fromTokenId, fromAmount)
      fromAmount = ONE.minus(poolPair.commission).times(fromAmount)
    }
  }

  async invalidateTransaction (_: RawBlock, transaction: DfTxTransaction<CompositeSwap>): Promise<void> {
    const data = transaction.dftx.data
    const poolSwap = data.poolSwap
    const poolIds = await this.getPoolIdsForTokens(data)

    let fromAmount: BigNumber = poolSwap.fromAmount

    for (const pool of poolIds) {
      const poolPair = await this.getPoolPair(pool.id)
      await this.poolSwapIndexer.invalidateSwap(transaction, poolPair.poolPairId, poolSwap.fromTokenId, fromAmount)
      fromAmount = ONE.minus(poolPair.commission).times(fromAmount)
    }
  }

  async getPoolPair (poolId: number): Promise<PoolPairHistory> {
    // TODO(fuxingloh): we need to cache this too
    const poolPair = await this.poolPairHistoryMapper.getLatest(`${poolId}`)
    if (poolPair === undefined) {
      throw new IndexerError(`Pool with id ${poolId} not found`)
    }

    return poolPair
  }

  async getPoolIdsForTokens (compositeSwap: CompositeSwap): Promise<PoolId[]> {
    if (compositeSwap.pools.length > 0) {
      return compositeSwap.pools
    }

    const poolSwap = compositeSwap.poolSwap
    const poolPairToken = await this.poolPairTokenMapper.getPair(poolSwap.fromTokenId, poolSwap.toTokenId)
    if (poolPairToken === undefined) {
      throw new IndexerError(`Pool for pair ${poolSwap.fromTokenId}, ${poolSwap.toTokenId} not found`)
    }

    return [{ id: poolPairToken.poolPairId }]
  }
}
