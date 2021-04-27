import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'

import { ApiModule } from '@src/module.api'
import { DeFiDModule } from '@src/module.defid'
import configuration from '@src/app.configuration'
import { HealthModule } from '@src/module.health'
import { DatabaseModule } from '@src/module.database'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration]
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    DeFiDModule,
    HealthModule,
    ApiModule
  ]
})
export class AppModule {
}
