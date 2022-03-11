import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ActuatorModule } from '@defichain-apps/libs/actuator'
import { ScheduleModule } from '@nestjs/schedule'
import { IndexerModule } from './IndexerModule'
import { ModelModule } from '../models/ModelModule'
import { BlockchainCppModule } from '@defichain-apps/libs/blockchaincpp'

function AppConfiguration (): any {
  return {
    BLOCKCHAIN_CPP_URL: process.env.INDEXER_DEFID_URL,
    INDEXER_DYNAMODB_ENDPOINT: process.env.INDEXER_DYNAMODB_ENDPOINT,
    INDEXER_DYNAMODB_REGION: process.env.INDEXER_DYNAMODB_REGION,
    INDEXER_DYNAMODB_ACCESSKEYID: process.env.INDEXER_DYNAMODB_ACCESSKEYID,
    INDEXER_DYNAMODB_SECRETACCESSKEY: process.env.INDEXER_DYNAMODB_SECRETACCESSKEY
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
    IndexerModule,
    ModelModule
  ]
})
export class RootModule {
}
