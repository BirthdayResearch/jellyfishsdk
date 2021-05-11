import { DynamicModule, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'

import { ApiModule } from '@src/module.api/_module'
import { DatabaseModule } from '@src/module.database/module'
import { DeFiDModule } from '@src/module.defid'
import { HealthModule } from '@src/module.health'
import { ModelModule } from '@src/module.model/_module'
import { AppConfiguration } from '@src/app.configuration'

@Module({})
export class AppModule {
  static forRoot (provider?: string): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [AppConfiguration]
        }),
        ScheduleModule.forRoot(),
        DatabaseModule.forRoot(provider),
        ModelModule,
        DeFiDModule,
        HealthModule,
        ApiModule
      ]
    }
  }
}
