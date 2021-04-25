import { Module } from '@nestjs/common'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { CallController } from '@src/module-api/controller.call'
import { NetworkGuard } from '@src/module-api/commons/guard.network'
import { TransformInterceptor } from '@src/module-api/commons/interceptor.transform'
import { ExceptionInterceptor } from '@src/module-api/commons/interceptor.exception'

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
