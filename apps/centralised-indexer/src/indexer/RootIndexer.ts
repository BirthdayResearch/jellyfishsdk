import { Injectable } from '@nestjs/common'
import { blockchain as defid } from '@defichain/jellyfish-api-core'
import { RootDfTxIndexer } from './RootDfTxIndexer'
import { BlockIndexer } from './block/BlockIndexer'

export interface Indexer {
  index: (block: defid.Block<defid.Transaction>) => Promise<void>
  invalidate: (block: defid.Block<defid.Transaction>) => Promise<void>
}

/**
 * Delegates to multiple indexers that are registered here
 */
@Injectable()
export class RootIndexer implements Indexer {
  private readonly indexers: Indexer[]

  constructor (
    private readonly blockIndexer: BlockIndexer,
    private readonly rootDfTxIndexer: RootDfTxIndexer
  ) {
    this.indexers = [
      blockIndexer,
      rootDfTxIndexer
    ]
  }

  async index (block: defid.Block<defid.Transaction>): Promise<void> {
    for (const indexer of this.indexers) {
      await indexer.index(block)
    }
  }

  async invalidate (block: defid.Block<defid.Transaction>): Promise<void> {
    for (const indexer of this.indexers) {
      await indexer.invalidate(block)
    }
  }
}
