import { Injectable } from '@nestjs/common'
import { Indexer } from '../../module.indexer/model/_abstract'
import { BlockIndexer } from '../../module.indexer/model/block'
import { ScriptActivityIndexer } from '../../module.indexer/model/script.activity'
import { ScriptAggregationIndexer } from '../../module.indexer/model/script.aggregation'
import { ScriptUnspentIndexer } from '../../module.indexer/model/script.unspent'
import { TransactionIndexer } from '../../module.indexer/model/transaction'
import { TransactionVinIndexer } from '../../module.indexer/model/transaction.vin'
import { TransactionVoutIndexer } from '../../module.indexer/model/transaction.vout'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { RawBlockMapper } from '../../module.model/raw.block'
import { NotFoundIndexerError } from '../../module.indexer/error'
import { blockchain as defid } from '@defichain/jellyfish-api-core'
import { MainDfTxIndexer } from '../../module.indexer/model/dftx.indexer'
import { BlockMintedIndexer } from '../../module.indexer/model/block.minted'

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
    private readonly transactionVout: TransactionVoutIndexer,
    private readonly dftx: MainDfTxIndexer,
    private readonly blockMinted: BlockMintedIndexer
  ) {
    this.indexers = [
      block,
      scriptActivity,
      scriptAggregation,
      scriptUnspent,
      transaction,
      transactionVin,
      transactionVout,
      dftx,
      blockMinted
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
