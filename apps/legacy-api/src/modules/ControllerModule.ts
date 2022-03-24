import { CacheModule, Module } from '@nestjs/common'
import { TokenController } from '../controllers/TokenController'
import { PoolPairController, PoolPairControllerV2 } from '../controllers/PoolPairController'
import { MiscController } from '../controllers/MiscController'
import { WhaleApiClientProvider } from '../providers/WhaleApiClientProvider'
import { StatsController } from '../controllers/stats/StatsController'
import { MainnetLegacyStatsProvider, TestnetLegacyStatsProvider } from '../controllers/stats/LegacyStatsProvider'
import { ActuatorController } from '@defichain-apps/libs/actuator'

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
    PoolPairControllerV2,
    MiscController,
    StatsController,
    ActuatorController
  ],
  providers: [
    WhaleApiClientProvider,
    MainnetLegacyStatsProvider,
    TestnetLegacyStatsProvider
  ]
})
export class ControllerModule {
}
