import { Global, Injectable, Module } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ConfigService } from '@nestjs/config'
import { ApiClient, blockchain as bc } from '@defichain/jellyfish-api-core'
import { ActuatorProbes, ProbeIndicator } from './ActuatorModule'
import { HealthIndicatorResult } from '@nestjs/terminus'

/**
 * Ain DeFiD healthcheck.
 */
@Injectable()
export class AinProbeIndicator extends ProbeIndicator {
  constructor (private readonly client: ApiClient) {
    super()
  }

  /**
   * Liveness of DeFid.
   * - defid is not connected
   */
  async liveness (): Promise<HealthIndicatorResult> {
    try {
      await this.client.net.getConnectionCount()
      return this.withAlive('ain')
    } catch (err) {
      return this.withDead('ain', 'unable to connect to defid')
    }
  }

  /**
   * Readiness of FullNode.
   * - defid is not in initial block download
   * - defid is connected to only count<5 peers
   */
  async readiness (): Promise<HealthIndicatorResult> {
    let info: bc.BlockchainInfo
    let peers: number
    try {
      info = await this.client.blockchain.getBlockchainInfo()
      peers = await this.client.net.getConnectionCount()
    } catch (err) {
      return this.withDead('ain', 'unable to connect to defid')
    }

    const details = {
      initialBlockDownload: info.initialblockdownload,
      blocks: info.blocks,
      headers: info.headers,
      peers: peers
    }

    if (peers === 0) {
      return this.withDead('ain', 'is not connected to any peer', details)
    }

    if (info.blocks + 4 <= info.headers) {
      return this.withDead('ain', 'blocks are more than 4 headers behind', details)
    }

    return this.withAlive('ain', details)
  }
}

/**
 * Ain Module configures and export JsonRpcClient connected to a DeFiD.
 * This does not has any side-effect it merely configures and export a JsonRpcClient.
 */
@Global()
@Module({
  providers: [
    AinProbeIndicator,
    {
      provide: ApiClient,
      useFactory: (configService: ConfigService): ApiClient => {
        const url = configService.get<string>('FULL_NODE_URL')
        if (url === undefined) {
          throw new Error('AinModule config:FULL_NODE_URL not provided')
        }
        return new JsonRpcClient(configService.get<string>('FULL_NODE_URL') as string)
      },
      inject: [ConfigService]
    }
  ],
  exports: [
    ApiClient
  ]
})
export class AinModule {
  constructor (
    private readonly probes: ActuatorProbes,
    private readonly ainProbeIndicator: AinProbeIndicator
  ) {
  }

  async onApplicationBootstrap (): Promise<void> {
    this.probes.add(this.ainProbeIndicator)
  }
}
