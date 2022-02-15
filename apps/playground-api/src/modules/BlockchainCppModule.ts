import { Global, Injectable, Module } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ConfigService } from '@nestjs/config'
import { ApiClient, blockchain as bc } from '@defichain/jellyfish-api-core'
// import { ActuatorProbes, ProbeIndicator } from './ActuatorModule'
import { /* ActuatorProbes, */ ProbeIndicator } from '@defichain-apps/ocean-api/src/modules/ActuatorModule'
import { HealthIndicatorResult } from '@nestjs/terminus'

/**
 * Blockchain CPP DeFiD health check.
 */
@Injectable()
export class BlockchainCppProbeIndicator extends ProbeIndicator {
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
      return this.withAlive('blockchain')
    } catch (err) {
      return this.withDead('blockchain', 'unable to connect to defid')
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
      return this.withDead('blockchain', 'unable to connect to defid')
    }

    const details = {
      initialBlockDownload: info.initialblockdownload,
      blocks: info.blocks,
      headers: info.headers,
      peers: peers
    }

    if (peers === 0) {
      return this.withDead('blockchain', 'is not connected to any peer', details)
    }

    if (info.blocks + 4 <= info.headers) {
      return this.withDead('blockchain', 'blocks are more than 4 headers behind', details)
    }

    return this.withAlive('blockchain', details)
  }
}

/**
 * Ain Module configures and export JsonRpcClient connected to a DeFiD.
 * This does not have any side effect it merely configures and export a JsonRpcClient.
 */
@Global()
@Module({
  providers: [
    // BlockchainCppProbeIndicator,
    {
      provide: ApiClient,
      useFactory: (configService: ConfigService): ApiClient => {
        const url = configService.get<string>('defid.url')
        if (url === undefined) {
          throw new Error('BlockchainCppModule config:defid.url not provided')
        }
        return new JsonRpcClient(configService.get<string>('defid.url') as string)
      },
      inject: [ConfigService]
    }
  ],
  exports: [
    ApiClient
  ]
})
export class BlockchainCppModule {
  // constructor (
  //   private readonly probes: ActuatorProbes,
  //   private readonly ainProbeIndicator: BlockchainCppProbeIndicator
  // ) {
  // }

  async onApplicationBootstrap (): Promise<void> {
    console.log('BlockchainCppModule onApplicationBootstrap')
    // this.probes.add(this.ainProbeIndicator)
  }
}
