import { DfTxIndexer, DfTxTransaction } from './_abstract'
import { CCompositeSwap, CompositeSwap, PoolId } from '@defichain/jellyfish-transaction'
import { RawBlock } from '../_abstract'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { NetworkName } from '@defichain/jellyfish-network'
import BigNumber from 'bignumber.js'
import { PoolPairPathMapping } from './pool.pair.path.mapping'
import { PoolSwapIndexer } from './pool.swap'

@Injectable()
export class CompositeSwapIndexer extends DfTxIndexer<CompositeSwap> {
  OP_CODE: number = CCompositeSwap.OP_CODE
  private readonly logger = new Logger(CompositeSwapIndexer.name)

  constructor (
    private readonly poolSwapIndexer: PoolSwapIndexer,
    private readonly poolPairPathMapping: PoolPairPathMapping,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<CompositeSwap>): Promise<void> {
    const data = transaction.dftx.data
    const poolSwap = data.poolSwap
    const poolIds = await this.getPoolIdsForTokens(data)

    const fromAmount: BigNumber = poolSwap.fromAmount

    for (const pool of poolIds) {
      await this.poolSwapIndexer.indexSwap(block, transaction, `${pool.id}`, poolSwap.fromTokenId, fromAmount)
    }
  }

  async invalidateTransaction (_: RawBlock, transaction: DfTxTransaction<CompositeSwap>): Promise<void> {
    const data = transaction.dftx.data
    const poolSwap = data.poolSwap
    const poolIds = await this.getPoolIdsForTokens(data)

    const fromAmount: BigNumber = poolSwap.fromAmount

    for (const pool of poolIds) {
      await this.poolSwapIndexer.invalidateSwap(transaction, `${pool.id}`, poolSwap.fromTokenId, fromAmount)
    }
  }

  async getPoolIdsForTokens (compositeSwap: CompositeSwap): Promise<PoolId[]> {
    if (compositeSwap.pools.length > 0) {
      return compositeSwap.pools
    }

    const poolSwap = compositeSwap.poolSwap
    const pair = await this.poolPairPathMapping.findPair(poolSwap.fromTokenId, poolSwap.toTokenId)
    if (pair !== undefined) {
      return [{ id: Number(pair.id) }]
    }

    this.logger.error(`Pool for pair ${poolSwap.fromTokenId}, ${poolSwap.toTokenId} not found in PoolPairPathMapping`)
    return []
  }
}
