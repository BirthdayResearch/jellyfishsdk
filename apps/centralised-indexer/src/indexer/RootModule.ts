import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DeFiDModule } from '../defid/_module'
import { ActuatorModule } from '@defichain-apps/libs/actuator'
import { ScheduleModule } from '@nestjs/schedule'
import { IndexerModule } from './_module'
import { ModelModule } from '../models/_module'

function AppConfiguration (): any {
  return {
    isProd: process.env.NODE_ENV === 'production',
    defid: {
      url: process.env.INDEXER_DEFID_URL
    }
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
    DeFiDModule,
    IndexerModule,
    ModelModule
  ]
})
export class RootModule {
}
