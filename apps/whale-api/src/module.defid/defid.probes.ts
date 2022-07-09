import { Injectable } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { HealthIndicatorResult, ProbeIndicator } from '../module.health/probe.indicator'
import { blockchain as bc } from '@defichain/jellyfish-api-core'

@Injectable()
export class DeFiDProbeIndicator extends ProbeIndicator {
  constructor (private readonly client: JsonRpcClient) {
    super()
  }

  /**
   * Liveness of DeFiD.
   * - defid is not connected
   */
  async liveness (): Promise<HealthIndicatorResult> {
    try {
      await this.client.net.getConnectionCount()
    } catch (err) {
      return this.withDead('defid', 'unable to connect to defid')
    }

    return this.withAlive('defid')
  }

  /**
   * Readiness of DeFiD.
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
      return this.withDead('defid', 'unable to connect to defid')
    }

    const details = {
      initialBlockDownload: info.initialblockdownload,
      blocks: info.blocks,
      headers: info.headers,
      peers: peers
    }

    if (info.initialblockdownload) {
      return this.withDead('defid', 'defid is in initial block download', details)
    }

    if (peers === 0) {
      return this.withDead('defid', 'defid is not connected to any peer', details)
    }

    return this.withAlive('defid', details)
  }
}
