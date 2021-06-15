import { Injectable } from '@nestjs/common'
import { Indexer } from '@src/module.indexer/model/_abstract'
import { BlockIndexer } from '@src/module.indexer/model/block'
import { ScriptActivityIndexer } from '@src/module.indexer/model/script.activity'
import { ScriptAggregationIndexer } from '@src/module.indexer/model/script.aggregation'
import { ScriptUnspentIndexer } from '@src/module.indexer/model/script.unspent'
import { TransactionIndexer } from '@src/module.indexer/model/transaction'
import { TransactionVinIndexer } from '@src/module.indexer/model/transaction.vin'
import { TransactionVoutIndexer } from '@src/module.indexer/model/transaction.vout'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { RawBlockMapper } from '@src/module.model/raw.block'
import { NotFoundIndexerError } from '@src/module.indexer/error'
import { blockchain as defid } from '@defichain/jellyfish-api-core'

/**
 * This is a deterministic log based indexer.
 */
@Injectable()
export class MainIndexer {
  private readonly indexers: Indexer[]

  constructor (
    private readonly client: JsonRpcClient,
    private readonly rawBlock: RawBlockMapper,
    private readonly block: BlockIndexer,
    private readonly scriptActivity: ScriptActivityIndexer,
    private readonly scriptAggregation: ScriptAggregationIndexer,
    private readonly scriptUnspent: ScriptUnspentIndexer,
    private readonly transaction: TransactionIndexer,
    private readonly transactionVin: TransactionVinIndexer,
    private readonly transactionVout: TransactionVoutIndexer
  ) {
    this.indexers = [
      block,
      scriptActivity,
      scriptAggregation,
      scriptUnspent,
      transaction,
      transactionVin,
      transactionVout
    ]
  }

  async index (block: defid.Block<defid.Transaction>): Promise<void> {
    await this.rawBlock.put(block)
    for (const indexer of this.indexers) {
      await indexer.index(block)
    }
  }

  async invalidate (hash: string): Promise<void> {
    const block = await this.rawBlock.get(hash)
    if (block === undefined) {
      throw new NotFoundIndexerError('invalidate', 'RawBlock', hash)
    }
    for (const indexer of this.indexers) {
      await indexer.invalidate(block)
    }
  }
}
