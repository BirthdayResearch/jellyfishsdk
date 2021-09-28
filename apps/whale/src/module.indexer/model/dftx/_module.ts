import { Module } from '@nestjs/common'
import { AppointOracleIndexer } from '@src/module.indexer/model/dftx/appoint.oracle'
import { RemoveOracleIndexer } from '@src/module.indexer/model/dftx/remove.oracle'
import { UpdateOracleIndexer } from '@src/module.indexer/model/dftx/update.oracle'
import { SetOracleDataIndexer } from '@src/module.indexer/model/dftx/set.oracle.data'
import { CreateMasternodeIndexer } from '@src/module.indexer/model/dftx/create.masternode'
import { ResignMasternodeIndexer } from '@src/module.indexer/model/dftx/resign.masternode'
import { CreateTokenIndexer } from '@src/module.indexer/model/dftx/create.token'
import { NetworkName } from '@defichain/jellyfish-network'
import { ConfigService } from '@nestjs/config'

const indexers = [
  AppointOracleIndexer,
  RemoveOracleIndexer,
  SetOracleDataIndexer,
  UpdateOracleIndexer,
  CreateMasternodeIndexer,
  ResignMasternodeIndexer,
  CreateTokenIndexer
]

@Module({
  providers: [...indexers,
    {
      provide: 'NETWORK',
      useFactory: (configService: ConfigService): NetworkName => {
        return configService.get<string>('network') as NetworkName
      },
      inject: [ConfigService]
    }],
  exports: indexers
})
export class DfTxIndexerModule {
}
