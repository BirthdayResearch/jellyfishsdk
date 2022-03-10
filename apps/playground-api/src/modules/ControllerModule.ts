import { CacheModule, Module } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { RpcController } from '../controllers/RpcController'
import { WalletController } from '../controllers/WalletController'
import { PlaygroundController } from '../controllers/PlaygroundController'
import { ActuatorController } from '@defichain-apps/libs/actuator'
import { GlobalValidationPipe, ResponseInterceptor, ErrorFilter } from '@defichain-apps/libs/filters'

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
