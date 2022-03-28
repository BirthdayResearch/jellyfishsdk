import { ProbeIndicator } from '../module.health/probe.indicator'
import { Injectable } from '@nestjs/common'
import { HealthIndicatorResult } from '@nestjs/terminus'
import { BlockMapper } from '../module.model/block'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

@Injectable()
export class ModelProbeIndicator extends ProbeIndicator {
  constructor (
    private readonly block: BlockMapper,
    private readonly client: JsonRpcClient
  ) {
    super()
  }

  /**
   * Liveness of Model Database
   * - unable to get the latest block from BlockMapper
   */
  async liveness (): Promise<HealthIndicatorResult> {
    try {
      await this.block.getHighest()
    } catch (err) {
      return this.withDead('model', 'unable to get the latest block')
    }

    return this.withAlive('model')
  }

  /**
   * Readiness of Model Database
   * - unable to get the latest block
   * - synced blocks are undefined
   * - synced blocks are more than 2 blocks behind
   */
  async readiness (): Promise<HealthIndicatorResult> {
    let index: number | undefined
    let defid: number | undefined

    try {
      index = (await this.block.getHighest())?.height
      defid = await this.client.blockchain.getBlockCount()
    } catch (err) {
      return this.withDead('model', 'unable to get the latest block')
    }

    const details = {
      count: {
        index: index,
        defid: defid
      }
    }

    if (index === undefined || defid === undefined) {
      return this.withDead('model', 'synced blocks are undefined', details)
    }

    if (index + 2 <= defid) {
      return this.withDead('model', 'synced blocks are more than 2 blocks behind', details)
    }

    return this.withAlive('model', details)
  }
}
