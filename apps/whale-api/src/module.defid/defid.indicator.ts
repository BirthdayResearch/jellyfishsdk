import { Injectable } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ProbeIndicator, HealthIndicatorResult } from '@src/module.health/probe.indicator'
import { BlockchainInfo } from '@defichain/jellyfish-api-core'

@Injectable()
export class DeFiDHealthIndicator extends ProbeIndicator {
  constructor (private readonly client: JsonRpcClient) {
    super()
  }

  /**
   * Check the liveness of DeFiD.
   */
  async liveness (): Promise<HealthIndicatorResult> {
    // TODO(fuxingloh): liveness must be able indicate when defid lost connection for a significant amount of time

    try {
      await this.client.blockchain.getBlockchainInfo()
    } catch (e) {
      return this.withDead('defid', 'unable to connect to defid')
    }

    return this.withAlive('defid')
  }

  /**
   * Check the readiness of DeFiD.
   */
  async readiness (): Promise<HealthIndicatorResult> {
    // TODO(fuxingloh): readiness criteria must be sufficient for global decentralized implementation

    let info: BlockchainInfo
    let count: number
    try {
      info = await this.client.blockchain.getBlockchainInfo()
      count = await this.client.call('getconnectioncount', [], 'number')
    } catch (e) {
      return this.withDead('defid', 'unable to connect to defid')
    }

    const details = {
      initialBlockDownload: true,
      blocks: info.blocks,
      headers: info.headers,
      peers: count
    }

    if (info.initialblockdownload) {
      return this.withDead('defid', 'defid in initial block download', details)
    }

    if (count === 0) {
      return this.withDead('defid', 'defid is not connected to any peers', details)
    }

    return this.withAlive('defid')
  }
}
