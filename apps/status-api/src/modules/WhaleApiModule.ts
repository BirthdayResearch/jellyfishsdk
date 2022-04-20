import { Global, Injectable, Module } from '@nestjs/common'
import { HealthIndicatorResult } from '@nestjs/terminus'
import { ActuatorProbes, ProbeIndicator } from '@defichain-apps/libs/actuator'
import { BlockchainInfo } from '@defichain/jellyfish-api-core/src/category/blockchain'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class WhaleApiProbeIndicator extends ProbeIndicator {
  constructor (private readonly client: WhaleApiClient) {
    super()
  }

  async liveness (): Promise<HealthIndicatorResult> {
    try {
      await this.client.stats.get()
      return this.withAlive('whale')
    } catch (ignored) {
      return this.withDead('whale', 'could not connect to mainnet')
    }
  }

  async readiness (): Promise<HealthIndicatorResult> {
    let info
    try {
      info = await this.client.rpc.call<BlockchainInfo>('getblockchaininfo', [], 'number')
    } catch (ignored) {
      return this.withDead('whale', 'could not get blockchain info from mainnet')
    }

    const details = {
      initialBlockDownload: info.initialblockdownload,
      blocks: info.blocks,
      headers: info.headers
    }
    return this.withAlive('whale', details)
  }
}

@Global()
@Module({
  providers: [
    WhaleApiProbeIndicator,
    {
      provide: WhaleApiClient,
      useFactory: (configService: ConfigService): WhaleApiClient => {
        return new WhaleApiClient({
          version: 'v0',
          network: configService.get<string>('network'),
          url: 'https://ocean.defichain.com'
        })
      },
      inject: [ConfigService]
    }
  ],
  exports: [
    WhaleApiProbeIndicator
  ]
})
export class WhaleApiModule {
  constructor (
    private readonly probes: ActuatorProbes,
    private readonly whaleApiClientProbeIndicator: WhaleApiProbeIndicator
  ) {
  }

  async onApplicationBootstrap (): Promise<void> {
    this.probes.add(this.whaleApiClientProbeIndicator)
  }
}
