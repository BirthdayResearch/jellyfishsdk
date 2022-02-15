import { APP_INTERCEPTOR } from '@nestjs/core'
import { Module } from '@nestjs/common'
import { RpcController } from './rpc.controller'
import { ActuatorController } from './actuator.controller'
import { ExceptionInterceptor } from './interceptors/exception.interceptor'
import { ResponseInterceptor } from './interceptors/response.interceptor'
import { PlaygroundController } from './playground.controller'
import { WalletController } from './wallet.controller'

/**
 * Exposed ApiModule for public interfacing
 */
@Module({
  controllers: [
    ActuatorController,
    RpcController,
    PlaygroundController,
    WalletController
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ExceptionInterceptor }
  ]
})
export class ApiModule {
}
