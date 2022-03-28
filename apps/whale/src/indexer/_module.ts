import { Logger, Module } from '@nestjs/common'
import { RPCBlockProvider } from './/rpc.block.provider'
import { MainIndexer } from './/model/_main'
import { BlockIndexer } from './/model/block'
import { ScriptActivityIndexer } from './/model/script.activity'
import { ScriptAggregationIndexer } from './/model/script.aggregation'
import { ScriptUnspentIndexer } from './/model/script.unspent'
import { TransactionIndexer } from './/model/transaction'
import { TransactionVinIndexer } from './/model/transaction.vin'
import { TransactionVoutIndexer } from './/model/transaction.vout'
import { VoutFinder } from './/model/_vout_finder'
import { IndexStatusMapper } from './/status'
import { DfTxIndexerModule } from './/model/dftx/_module'
import { MainDfTxIndexer } from './/model/dftx.indexer'
import { BlockMintedIndexer } from './/model/block.minted'
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
