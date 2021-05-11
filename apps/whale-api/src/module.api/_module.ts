import { APP_PIPE } from '@nestjs/core'
import { Module } from '@nestjs/common'
import { CallController } from '@src/module.api/call.controller'
import { HealthController } from '@src/module.api/health.controller'
import { TransactionsController } from '@src/module.api/transactions.controller'
import { ApiValidationPipe } from '@src/module.api/_validation'

/**
 * Exposed ApiModule for public interfacing
 */
@Module({
  controllers: [
    CallController,
    HealthController,
    TransactionsController
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ApiValidationPipe()
    }
  ]
})
export class ApiModule {
}
