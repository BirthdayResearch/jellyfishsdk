import { DfTxIndexer, DfTxTransaction } from './_abstract'
import { CCompositeSwap, CompositeSwap, PoolId } from '@defichain/jellyfish-transaction'
import { RawBlock } from '../_abstract'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { NetworkName } from '@defichain/jellyfish-network'
import BigNumber from 'bignumber.js'
import { IndexerError } from '../../error'
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
    this.logger.log(`[Pool.Swap] Index Transaction starting at block hash: ${block.hash} - height: ${block.height} - transaction: ${JSON.stringify(transaction)}`)
    const data = transaction.dftx.data
    const poolSwap = data.poolSwap
    const poolIds = await this.getPoolIdsForTokens(data)
    this.logger.log(`[Pool.Swap] Index Transaction - dftx-data: ${JSON.stringify(data)} - poolSwap: ${JSON.stringify(poolSwap)} - poolIds: ${JSON.stringify(poolIds)}`)

    const fromAmount: BigNumber = poolSwap.fromAmount

    for (const pool of poolIds) {
      await this.poolSwapIndexer.indexSwap(block, transaction, `${pool.id}`, poolSwap.fromTokenId, fromAmount)
    }
    this.logger.log(`[Pool.Swap] Index Transaction ended at block hash: ${block.hash} - height: ${block.height} - txid: ${transaction.txn.txid}`)
  }

  async invalidateTransaction (_: RawBlock, transaction: DfTxTransaction<CompositeSwap>): Promise<void> {
    this.logger.log(`[Pool.Swap] Invalidate Transaction starting at block hash: ${_.hash} - height: ${_.height} - transaction: ${JSON.stringify(transaction)}`)
    const data = transaction.dftx.data
    const poolSwap = data.poolSwap
    const poolIds = await this.getPoolIdsForTokens(data)
    this.logger.log(`[Pool.Swap] Invalidate Transaction - dftx-data: ${JSON.stringify(data)} - poolSwap: ${JSON.stringify(poolSwap)} - poolIds: ${JSON.stringify(poolIds)}`)

    const fromAmount: BigNumber = poolSwap.fromAmount

    for (const pool of poolIds) {
      await this.poolSwapIndexer.invalidateSwap(transaction, `${pool.id}`, poolSwap.fromTokenId, fromAmount)
    }
    this.logger.log(`[Pool.Swap] Index Transaction ended at block hash: ${_.hash} - height: ${_.height} - txid: ${transaction.txn.txid}`)
  }

  async getPoolIdsForTokens (compositeSwap: CompositeSwap): Promise<PoolId[]> {
    if (compositeSwap.pools.length > 0) {
      this.logger.log(`[Pool.Swap] getPoolIdsForTokens - compositeSwapPools: ${JSON.stringify(compositeSwap.pools)}`)
      return compositeSwap.pools
    }

    const poolSwap = compositeSwap.poolSwap
    const pair = await this.poolPairPathMapping.findPair(poolSwap.fromTokenId, poolSwap.toTokenId)
    this.logger.log(`[Pool.Swap] findPair - poolSwap: ${JSON.stringify(poolSwap)} - pair: ${JSON.stringify(pair)}`)
    if (pair !== undefined) {
      return [{ id: Number(pair.id) }]
    }

    throw new IndexerError(`Pool for pair ${poolSwap.fromTokenId}, ${poolSwap.toTokenId} not found in PoolPairPathMapping`)
  }
}
