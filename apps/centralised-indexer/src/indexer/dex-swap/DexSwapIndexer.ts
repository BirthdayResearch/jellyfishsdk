import { Indexer } from '../RootIndexer'
import { ApiClient, blockchain as defid } from '@defichain/jellyfish-api-core'

export class DexSwapIndexer implements Indexer {
  constructor (
    private readonly apiClient: ApiClient
  ) {
  }

  async index (block: defid.Block<defid.Transaction>): Promise<void> {
  }

  async invalidate (hash: string): Promise<void> {
  }
}
