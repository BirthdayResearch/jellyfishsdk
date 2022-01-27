import { CacheModule, Module } from '@nestjs/common'
import { TokenController } from '../controllers/TokenController'
import { PoolPairController } from '../controllers/PoolPairController'

/**
 * Exposed ApiModule for public interfacing
 */
@Module({
  imports: [
    CacheModule.register()
  ],
  controllers: [
    TokenController,
    PoolPairController
  ]
})
export class ControllerModule {
}
