import { Injectable } from '@nestjs/common'
import { blockchain as defid } from '@defichain/jellyfish-api-core'
import { BlockIndexer } from './block/BlockIndexer'
import { DexSwapIndexer } from './dex-swap/DexSwapIndexer'

export interface Indexer {
  index: (block: defid.Block<defid.Transaction>) => Promise<void>
  invalidate: (hash: string) => Promise<void>
}

/**
 * Delegates to multiple indexers that are registered here
 */
@Injectable()
export class RootIndexer implements Indexer {
  private readonly indexers: Indexer[]

  constructor (
    private readonly blockIndexer: BlockIndexer,
    private readonly dexSwapIndexer: DexSwapIndexer
  ) {
    this.indexers = [
      blockIndexer,
      dexSwapIndexer
    ]
  }

  async index (block: defid.Block<defid.Transaction>): Promise<void> {
    for (const indexer of this.indexers) {
      await indexer.index(block)
    }
  }

  async invalidate (hash: string): Promise<void> {
    for (const indexer of this.indexers) {
      await indexer.invalidate(hash)
    }
  }
}
