import { DynamicModule, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'

import { AppConfiguration } from '@src/app.configuration'

import { ApiModule } from '@src/module.api/_module'
import { DatabaseModule } from '@src/module.database/_module'
import { DeFiDModule } from '@src/module.defid/_module'
import { HealthModule } from '@src/module.health/_module'
import { IndexerModule } from '@src/module.indexer/_module'
import { ModelModule } from '@src/module.model/_module'

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
        ApiModule,
        DatabaseModule.forRoot(provider),
        DeFiDModule,
        HealthModule,
        IndexerModule,
        ModelModule
      ]
    }
  }
}
