import { NetworkName } from '@defichain/jellyfish-network'
import { Logger, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { BlockIndexer } from '../indexer/model/BlockIndexer'
import { BlockMintedIndexer } from '../indexer/model/BlockMintedIndexer'
import { MainDfTxIndexer } from '../indexer/model/MainDfTxIndexer'
import { MainIndexer } from '../indexer/model/MainIndexer'
import { ScriptActivityIndexer } from '../indexer/model/ScriptActivityIndexer'
import { ScriptAggregationIndexer } from '../indexer/model/ScriptAggregationIndexer'
import { ScriptUnspentIndexer } from '../indexer/model/ScriptUnspentIndexer'
import { TransactionIndexer } from '../indexer/model/TransactionIndexer'
import { TransactionVinIndexer } from '../indexer/model/TransactionVinIndexer'
import { TransactionVoutIndexer } from '../indexer/model/TransactionVoutIndexer'
import { VoutFinder } from '../indexer/model/VoutFinder'
import { RPCBlockProvider } from '../indexer/RPCBlockProvider'
import { IndexStatusMapper } from '../indexer/Status'
import { DfTxIndexerModule } from '../modules/DfTxIndexerModule'

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
