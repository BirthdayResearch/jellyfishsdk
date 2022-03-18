import { Injectable } from '@nestjs/common'
import { blockchain as defid } from '@defichain/jellyfish-api-core'
import { RootDfTxIndexer } from '../dftx/RootDfTxIndexer'
import { BlockIndexer } from './block/BlockIndexer'
import { Block } from '../../models/block/Block'

export interface Indexer {
  index: (block: defid.Block<defid.Transaction>) => Promise<void>

  /**
   * Hook for invalidating data associated with a block. Very typically,
   * data indexed from invalidated blocks need to be deleted.
   * @param {Block} block - the indexed block that is to be invalidated
   */
  invalidate: (block: Block) => Promise<void>
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

  async invalidate (block: Block): Promise<void> {
    for (const indexer of this.indexers) {
      await indexer.invalidate(block)
    }
  }
}
