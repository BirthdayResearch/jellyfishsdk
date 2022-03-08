import { Global, Injectable, Module } from '@nestjs/common'
import { HealthIndicatorResult } from '@nestjs/terminus'
import { WhaleApiClientProvider } from '../providers/WhaleApiClientProvider'
import { ActuatorProbes, ProbeIndicator } from '@defichain-apps/libs/actuator'
import { BlockchainInfo } from '@defichain/jellyfish-api-core/src/category/blockchain'

@Injectable()
export class WhaleApiProbeIndicator extends ProbeIndicator {
  constructor (private readonly clientProvider: WhaleApiClientProvider) {
    super()
  }

  async liveness (): Promise<HealthIndicatorResult> {
    try {
      const client = this.clientProvider.getClient('mainnet')
      await client.stats.get()
      return this.withAlive('whale')
    } catch (ignored) {
      return this.withDead('whale', 'could not connect to mainnet')
    }
  }

  async readiness (): Promise<HealthIndicatorResult> {
    let info
    try {
      const client = this.clientProvider.getClient('mainnet')
      info = await client.rpc.call<BlockchainInfo>('getblockchaininfo', [], 'number')
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
    WhaleApiClientProvider
  ],
  exports: [
    WhaleApiClientProvider
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
