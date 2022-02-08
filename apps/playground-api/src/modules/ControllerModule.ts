import { CacheModule, Module } from '@nestjs/common'
import { ActuatorController } from '../controllers/ActuatorController'
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { RpcController } from '../controllers/RpcController'
import { WalletController } from '../controllers/WalletController'
import { PlaygroundController } from '../controllers/PlaygroundController'
import { GlobalValidationPipe } from '@defichain-apps/ocean-api/src/controllers/filters/GlobalValidationPipe'
import { ResponseInterceptor } from '@defichain-apps/ocean-api/src/controllers/filters/ResponseInterceptor'
import { ErrorFilter } from '@defichain-apps/ocean-api/src/controllers/filters/ErrorFilter'

/**
 * Exposed ApiModule for public interfacing
 */
@Module({
  imports: [
    CacheModule.register()
  ],
  controllers: [
    ActuatorController,
    PlaygroundController,
    RpcController,
    WalletController
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: GlobalValidationPipe
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor
    },
    {
      provide: APP_FILTER,
      useClass: ErrorFilter
    }
  ]
})
export class ControllerModule {
}
