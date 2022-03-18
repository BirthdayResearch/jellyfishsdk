import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ActuatorModule } from '@defichain-apps/libs/actuator'
import { ScheduleModule } from '@nestjs/schedule'
import { BlockchainCppModule } from '@defichain-apps/libs/blockchaincpp'

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
    BlockchainCppModule
  ],
  providers: [
    {
      provide: 'NETWORK',
      useFactory: async (configService: ConfigService) => {
        return configService.get<string>('NETWORK')
      },
      inject: [ConfigService]
    }
  ]
})
export class IndexerModule {
}
