import { DfTxIndexer, DfTxTransaction } from './_abstract'
import { CCompositeSwap, CompositeSwap, PoolId } from '@defichain/jellyfish-transaction'
import { RawBlock } from '../_abstract'
import { Inject, Injectable } from '@nestjs/common'
import { PoolSwapIndexer } from './pool.swap'
import { NetworkName } from '@defichain/jellyfish-network'
import BigNumber from 'bignumber.js'
import { DeFiDCache } from '../../../module.api/cache/defid.cache'
import { NotFoundApiException } from '../../../module.api/_core/api.error'

@Injectable()
export class CompositeSwapIndexer extends DfTxIndexer<CompositeSwap> {
  OP_CODE: number = CCompositeSwap.OP_CODE

  constructor (
    private readonly poolSwapIndexer: PoolSwapIndexer,
    private readonly deFiDCache: DeFiDCache,
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
    const fromToken = await this.deFiDCache.getTokenInfo(`${poolSwap.fromTokenId}`)
    if (fromToken === undefined) {
      throw new NotFoundApiException('Unable to find fromToken')
    }

    const toToken = await this.deFiDCache.getTokenInfo(`${poolSwap.toTokenId}`)
    if (toToken === undefined) {
      throw new NotFoundApiException('Unable to find toToken')
    }

    let poolPair = await this.deFiDCache.getPoolPairInfo(`${fromToken.symbol}-${toToken.symbol}`)
    if (poolPair === undefined) {
      poolPair = await this.deFiDCache.getPoolPairInfo(`${toToken.symbol}-${fromToken.symbol}`)
    }
    if (poolPair === undefined) {
      throw new NotFoundApiException(`Pool for pair ${poolSwap.fromTokenId}, ${poolSwap.toTokenId} not found`)
    }

    return [{ id: Number(poolPair.id) }]
  }
}
