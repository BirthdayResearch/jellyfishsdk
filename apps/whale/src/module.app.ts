import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'

import { ApiModule } from '@src/module-api'
import { DeFiDModule } from '@src/module.defid'
import configuration from '@src/configuration'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration]
    }),
    ScheduleModule.forRoot(),
    DeFiDModule.forRoot(),
    ApiModule
  ]
})
export class AppModule {
}
