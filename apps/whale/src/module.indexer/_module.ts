import { Logger, Module } from '@nestjs/common'
import { RPCBlockProvider } from '@src/module.indexer/rpc.block.provider'
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
import { DfTxIndexerModule } from '@src/module.indexer/model/dftx/_module'
import { MainDfTxIndexer } from '@src/module.indexer/model/dftx.indexer'
import { BlockMintedIndexer } from '@src/module.indexer/model/block.minted'
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
