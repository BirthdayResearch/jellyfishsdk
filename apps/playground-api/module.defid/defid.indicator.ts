import { Injectable } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ProbeIndicator, HealthIndicatorResult } from '../module.health/probe.indicator'

@Injectable()
export class DeFiDProbeIndicator extends ProbeIndicator {
  constructor (private readonly client: JsonRpcClient) {
    super()
  }

  async liveness (): Promise<HealthIndicatorResult> {
    try {
      await this.client.blockchain.getBlockCount()
    } catch (e) {
      return this.withDead('defid', 'unable to connect to defid')
    }

    return this.withAlive('defid')
  }

  /**
   * Check the readiness of DeFiD.
   */
  async readiness (): Promise<HealthIndicatorResult> {
    return this.withAlive('defid')
  }
}
