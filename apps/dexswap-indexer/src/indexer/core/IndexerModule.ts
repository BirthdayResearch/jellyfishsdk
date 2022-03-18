import { Logger, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ActuatorModule } from '@defichain-apps/libs/actuator'
import { ScheduleModule } from '@nestjs/schedule'
import { ModelModule } from '../../models/ModelModule'
import { BlockchainCppModule } from '@defichain-apps/libs/blockchaincpp'
import { RootIndexer } from './RootIndexer'
import { RpcBlockProvider } from './RpcBlockProvider'
import { BlockIndexer } from './block/BlockIndexer'
import { DexSwapIndexer } from '../dftx/DexSwapIndexer'
import { RootDfTxIndexer } from '../dftx/RootDfTxIndexer'
import { CreateTokenIndexer } from '../dftx/CreateTokenIndexer'

function AppConfiguration (): Record<string, string | undefined> {
  return {
    BLOCKCHAIN_CPP_URL: process.env.INDEXER_DEFID_URL,
    INDEXER_DYNAMODB_ENDPOINT: process.env.INDEXER_DYNAMODB_ENDPOINT,
    INDEXER_DYNAMODB_REGION: process.env.INDEXER_DYNAMODB_REGION,
    INDEXER_DYNAMODB_ACCESSKEYID: process.env.INDEXER_DYNAMODB_ACCESSKEYID,
    INDEXER_DYNAMODB_SECRETACCESSKEY: process.env.INDEXER_DYNAMODB_SECRETACCESSKEY,
    NETWORK: process.env.NETWORK ?? 'mainnet'
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [AppConfiguration]
    }),
    ActuatorModule,
    ScheduleModule.forRoot(),
    BlockchainCppModule,
    ModelModule.register({
      readOnly: false
    })
  ],
  providers: [
    {
      provide: 'NETWORK',
      useFactory: async (configService: ConfigService) => {
        return configService.get<string>('NETWORK')
      },
      inject: [ConfigService]
    },
    Logger,
    RpcBlockProvider,

    RootIndexer,
    BlockIndexer,

    RootDfTxIndexer,
    DexSwapIndexer,
    CreateTokenIndexer
  ]
})
export class IndexerModule {
  private readonly logger = new Logger(IndexerModule.name)

  constructor (private readonly provider: RpcBlockProvider) {
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
