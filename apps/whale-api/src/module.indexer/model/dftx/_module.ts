import { Module } from '@nestjs/common'
import { AppointOracleIndexer } from '@src/module.indexer/model/dftx/appoint.oracle'
import { RemoveOracleIndexer } from '@src/module.indexer/model/dftx/remove.oracle'
import { UpdateOracleIndexer } from '@src/module.indexer/model/dftx/update.oracle'
import { SetOracleDataIndexer } from '@src/module.indexer/model/dftx/set.oracle.data'

const indexers = [
  AppointOracleIndexer,
  RemoveOracleIndexer,
  SetOracleDataIndexer,
  UpdateOracleIndexer
]

@Module({
  providers: indexers,
  exports: indexers
})
export class DfTxIndexerModule {
}
