import { Indexer } from '../RootIndexer'
import { blockchain as defid } from '@defichain/jellyfish-api-core'

export class BlockIndexer implements Indexer {
  async index (block: defid.Block<defid.Transaction>): Promise<void> {
    return await Promise.resolve(undefined)
  }

  async invalidate (hash: string): Promise<void> {
    return await Promise.resolve(undefined)
  }
}
