import { CacheModule, Module } from '@nestjs/common'
import { TokenController } from '../controllers/TokenController'
import { PoolPairController } from '../controllers/PoolPairController'
import { MiscController } from '../controllers/MiscController'

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
    MiscController
  ]
})
export class ControllerModule {
}
