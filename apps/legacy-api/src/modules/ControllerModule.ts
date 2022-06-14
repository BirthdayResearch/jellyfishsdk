import { CacheModule, Module } from '@nestjs/common'
import { TokenController } from '../controllers/TokenController'
import { PoolPairController, PoolPairControllerV2 } from '../controllers/PoolPairController'
import { MiscController } from '../controllers/MiscController'
import { WhaleApiClientProvider } from '../providers/WhaleApiClientProvider'
import { StatsController } from '../controllers/stats/StatsController'
import { MainnetLegacyStatsProvider, TestnetLegacyStatsProvider } from '../controllers/stats/LegacyStatsProvider'
import { ActuatorController } from '@defichain-apps/libs/actuator'
import { ScheduleModule } from '@nestjs/schedule'
import { SimpleCache } from '../cache/SimpleCache'
import { ConfigService } from '@nestjs/config'

/**
 * Exposed ApiModule for public interfacing
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    CacheModule.register({
      max: 1_000_000
    })
  ],
  controllers: [
    TokenController,
    PoolPairController,
    PoolPairControllerV2,
    MiscController,
    StatsController,
    ActuatorController
  ],
  providers: [
    WhaleApiClientProvider,
    MainnetLegacyStatsProvider,
    TestnetLegacyStatsProvider,
    PoolPairController,
    SimpleCache,
    {
      provide: 'SWAP_CACHE_COUNT',
      useFactory: (cfg: ConfigService): number => {
        const swapCacheCount = cfg.get<string>('SWAP_CACHE_COUNT')
        if (swapCacheCount === undefined) {
          throw new Error('cfg:SWAP_CACHE_COUNT was not provided')
        }
        return Number(swapCacheCount)
      },
      inject: [ConfigService]
    }
  ]
})
export class ControllerModule {
}
