import { Module } from '@nestjs/common'
import { Indexer } from '@src/module.indexer/indexer'
import { MainIndexer } from '@src/module.indexer/model/_main'
import { BlockIndexer } from '@src/module.indexer/model/block'
import { ScriptActivityIndexer } from '@src/module.indexer/model/script.activity'
import { ScriptAggregationIndexer } from '@src/module.indexer/model/script.aggregation'
import { ScriptUnspentIndexer } from '@src/module.indexer/model/script.unspent'
import { TransactionIndexer } from '@src/module.indexer/model/transaction'
import { TransactionVinIndexer } from '@src/module.indexer/model/transaction.vin'
import { TransactionVoutIndexer } from '@src/module.indexer/model/transaction.vout'
import { VoutFinder } from '@src/module.indexer/model/_vout_finder'
import { IndexStatusMapper } from '@src/module.indexer/status'

@Module({
  providers: [
    Indexer,
    MainIndexer,
    IndexStatusMapper,
    VoutFinder,
    BlockIndexer,
    ScriptActivityIndexer,
    ScriptAggregationIndexer,
    ScriptUnspentIndexer,
    TransactionIndexer,
    TransactionVinIndexer,
    TransactionVoutIndexer
  ]
})
export class IndexerModule {
}
