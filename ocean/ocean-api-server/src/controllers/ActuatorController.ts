import { Controller, Get } from '@nestjs/common'
import {
  HealthCheck,
  HealthCheckError,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicator,
  HealthIndicatorResult
} from '@nestjs/terminus'

@Controller('/_actuator')
export class ActuatorController {
  private readonly probes: ProbeIndicator[]

  constructor (private readonly health: HealthCheckService) {
    this.probes = []
  }

  /**
   * Indicates whether the service is running.
   * If the liveness probe fails, the service should be killed and subjected to a restart policy.
   * @see https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#when-should-you-use-a-liveness-probe
   */
  @Get('/probes/liveness')
  @HealthCheck()
  async liveness (): Promise<HealthCheckResult> {
    return await this.health.check(this.probes.map(probe => {
      return async () => await probe.liveness()
    }))
  }

  /**
   * Indicates whether the service is ready to respond to requests.
   * If the readiness probe fails, the endpoints are not ready to receive and respond to any request.
   * @see https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#when-should-you-use-a-readiness-probe
   */
  @Get('/probes/readiness')
  @HealthCheck()
  async readiness (): Promise<HealthCheckResult> {
    return await this.health.check(this.probes.map(probe => {
      return async () => await probe.readiness()
    }))
  }
}

/**
 * ProbeIndicator extends HealthIndicator to provide kubernetes specified probes.
 * This probes can be used for other heartbeat or health check systems.
 */
export abstract class ProbeIndicator extends HealthIndicator {
  /**
   * Check the liveness of this indicator.
   * This does not check whether the service is ready to receive connection.
   * @see https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#when-should-you-use-a-liveness-probe
   */
  abstract liveness (): Promise<HealthIndicatorResult>

  /**
   * Check the readiness of this indicator, indicating it is ready to receive connection.
   * @see https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#when-should-you-use-a-readiness-probe
   */
  abstract readiness (): Promise<HealthIndicatorResult>

  protected withAlive (key: string, details?: any): HealthIndicatorResult {
    return this.getStatus(key, true, details)
  }

  protected withDead (key: string, message: string, details?: any): HealthIndicatorResult {
    const result = this.getStatus(key, false, details)
    throw new HealthCheckError(message, result)
  }
}
