import { DynamicModule, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'

import { AppConfiguration } from './app.configuration'

import { ApiModule } from './module.api/_module'
import { DeFiDModule } from './module.defid/_module'
import { HealthModule } from './module.health/_module'
import { PlaygroundModule } from './module.playground/_module'

@Module({})
export class AppModule {
  static forRoot (): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [AppConfiguration]
        }),
        ScheduleModule.forRoot(),
        ApiModule,
        DeFiDModule,
        HealthModule,
        PlaygroundModule
      ]
    }
  }
}
