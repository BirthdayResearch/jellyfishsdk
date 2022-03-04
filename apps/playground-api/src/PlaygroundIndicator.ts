import { Injectable } from '@nestjs/common'
import { HealthIndicatorResult } from '@nestjs/terminus'
import { ProbeIndicator } from '@defichain-apps/libs/actuator'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class PlaygroundProbeIndicator extends ProbeIndicator {
  ready: boolean = false
  private readonly maxBlockCount: number

  constructor (private readonly client: JsonRpcClient, private readonly configService: ConfigService) {
    super()
    this.maxBlockCount = configService.get<number>('PLAYGROUND_MAX_BLOCK_COUNT', 20 * 60 * 24)
  }

  async liveness (): Promise<HealthIndicatorResult> {
    const count = await this.client.blockchain.getBlockCount()
    if (count > this.maxBlockCount) {
      return this.withDead('defid', `playground block count is over ${this.maxBlockCount}`)
    }

    return this.withAlive('playground')
  }

  /**
   * Check the readiness of DeFiD.
   */
  async readiness (): Promise<HealthIndicatorResult> {
    if (this.ready) {
      return this.withAlive('playground')
    }

    return this.withDead('playground', 'playground is not yet ready')
  }
}
