import { APP_PIPE } from '@nestjs/core'
import { Module, ValidationPipe } from '@nestjs/common'
import { CallController } from '@src/module.api/call.controller'
import { HealthController } from '@src/module.api/health.controller'
import { TransactionsController } from '@src/module.api/transactions.controller'

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
      useValue: new ValidationPipe({ transform: true })
    }
  ]
})
export class ApiModule {
}
