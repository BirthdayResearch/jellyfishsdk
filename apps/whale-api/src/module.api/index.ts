import { Module } from '@nestjs/common'
import { CallController } from '@src/module.api/call.controller'
import { HealthController } from '@src/module.api/health.controller'

/**
 * Exposed ApiModule for public interfacing
 */
@Module({
  controllers: [
    CallController,
    HealthController
  ]
})
export class ApiModule {
}
