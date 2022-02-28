import { CacheModule, Module } from '@nestjs/common'
import { TokenController } from '../controllers/TokenController'
import { PoolPairController } from '../controllers/PoolPairController'
import { MiscController } from '../controllers/MiscController'
import { WhaleApiClientProvider } from '../providers/WhaleApiClientProvider'
import { StatsController } from '../controllers/stats/StatsController'
import { MainnetLegacyStatsProvider, TestnetLegacyStatsProvider } from '../controllers/stats/LegacyStatsProvider'

/**
 * Exposed ApiModule for public interfacing
 */
@Module({
  imports: [
    CacheModule.register()
  ],
  controllers: [
    TokenController,
    PoolPairController,
    MiscController,
    StatsController
  ],
  providers: [
    WhaleApiClientProvider,
    MainnetLegacyStatsProvider,
    TestnetLegacyStatsProvider
  ]
})
export class ControllerModule {
}
