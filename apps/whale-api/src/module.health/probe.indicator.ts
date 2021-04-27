import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus'

export { HealthIndicatorResult, HealthCheckError }

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
