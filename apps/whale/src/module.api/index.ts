import { Module } from '@nestjs/common'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { CallController } from '@src/module.api/call.controller'
import { NetworkGuard } from '@src/module.api/commons/network.guard'
import { TransformInterceptor } from '@src/module.api/commons/transform.interceptor'
import { ExceptionInterceptor } from '@src/module.api/commons/exception.interceptor'

/**
 * Exposed ApiModule for public interfacing
 */
@Module({
  controllers: [
    CallController
  ],
  providers: [
    { provide: APP_GUARD, useClass: NetworkGuard },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ExceptionInterceptor }
  ]
})
export class ApiModule {
}
