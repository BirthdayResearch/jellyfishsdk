import { CacheModule, Module } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
// import { ActuatorController } from '../controllers/ActuatorController'
// import { RpcController } from '../controllers/RpcController'
// import { WalletController } from '../controllers/WalletController'
// import { PlaygroundController } from '../controllers/PlaygroundController'
import { TestController } from '../controllers/TestController'
import { GlobalValidationPipe } from '@defichain-apps/ocean-api/src/controllers/filters/GlobalValidationPipe'
import { ResponseInterceptor } from '@defichain-apps/ocean-api/src/controllers/filters/ResponseInterceptor'
import { ErrorFilter } from '@defichain-apps/ocean-api/src/controllers/filters/ErrorFilter'
// import { ErrorFilter } from '../controllers/filters/ErrorFilter'

@Module({
  imports: [
    CacheModule.register()
  ],
  controllers: [
    // ActuatorController,
    // PlaygroundController,
    // RpcController,
    // WalletController
    TestController
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
