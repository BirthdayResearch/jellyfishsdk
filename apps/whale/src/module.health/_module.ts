import { Global, Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'

/**
 * DeFi Whale Health Module for health check.
 * Provides probing of liveness & readiness of dependant services.
 */
@Global()
@Module({
  imports: [
    TerminusModule
  ],
  exports: [
    TerminusModule
  ]
})
export class HealthModule {
}
