import { Injectable } from '@nestjs/common'
import { Indexer } from './_abstract'
import { BlockIndexer } from './Block'
import { ScriptActivityIndexer } from './ScriptActivity'
import { ScriptAggregationIndexer } from './ScriptAggregation'
import { ScriptUnspentIndexer } from './ScriptUnspent'
import { TransactionIndexer } from './Transaction'
import { TransactionVinIndexer } from './TransactionVin'
import { TransactionVoutIndexer } from './TransactionVout'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { RawBlockMapper } from '../../model/RawBlock'
import { NotFoundIndexerError } from '../Error'
import { blockchain as defid } from '@defichain/jellyfish-api-core'
import { MainDfTxIndexer } from './DftxIndexer'
import { BlockMintedIndexer } from './BlockMinted'

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
