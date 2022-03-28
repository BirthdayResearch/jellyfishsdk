import { Logger, Module } from '@nestjs/common'
import { RPCBlockProvider } from './RPCBlockProvider'
import { MainIndexer } from './model/MainIndexer'
import { BlockIndexer } from './model/Block'
import { ScriptActivityIndexer } from './model/ScriptActivity'
import { ScriptAggregationIndexer } from './model/ScriptAggregation'
import { ScriptUnspentIndexer } from './model/ScriptUnspent'
import { TransactionIndexer } from './model/Transaction'
import { TransactionVinIndexer } from './model/TransactionVin'
import { TransactionVoutIndexer } from './model/TransactionVout'
import { VoutFinder } from './model/VoutFinder'
import { IndexStatusMapper } from './Status'
import { DfTxIndexerModule } from './model/dftx/_module'
import { MainDfTxIndexer } from './model/DftxIndexer'
import { BlockMintedIndexer } from './model/BlockMinted'
import { ConfigService } from '@nestjs/config'
import { NetworkName } from '@defichain/jellyfish-network'

@Module({
  providers: [
    RPCBlockProvider,
    MainIndexer,
    IndexStatusMapper,
    VoutFinder,
    BlockIndexer,
    ScriptActivityIndexer,
    ScriptAggregationIndexer,
    ScriptUnspentIndexer,
    TransactionIndexer,
    TransactionVinIndexer,
    TransactionVoutIndexer,
    MainDfTxIndexer,
    BlockMintedIndexer,
    {
      provide: 'NETWORK',
      useFactory: (configService: ConfigService): NetworkName => {
        return configService.get<string>('network') as NetworkName
      },
      inject: [ConfigService]
    }
  ],
  imports: [
    DfTxIndexerModule
  ]
})
export class IndexerModule {
  private readonly logger = new Logger(IndexerModule.name)

  constructor (private readonly provider: RPCBlockProvider) {
  }

  async onApplicationBootstrap (): Promise<void> {
    await this.provider.start()
    this.logger.log('Started IndexerModule')
  }

  async beforeApplicationShutdown (): Promise<void> {
    await this.provider.stop()
    this.logger.log('Stopped IndexerModule gracefully')
  }
}
