import { Injectable, Logger } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import BigNumber from 'bignumber.js'
import { PoolPairInfo } from '@defichain/jellyfish-api-core/dist/category/poolpair'
import { Interval } from '@nestjs/schedule'

@Injectable()
export class PoolPairService {
  private readonly logger = new Logger(PoolPairService.name)
  private USDT_PER_DFI: BigNumber | undefined
  private syncing: boolean = false

  constructor (
    protected readonly rpcClient: JsonRpcClient
  ) {
  }

  @Interval(60000)
  private async sync (): Promise<void> {
    if (this.syncing) return

    try {
      this.syncing = true
      await this.syncDfiUsdPair()
    } catch (err) {
      this.logger.error('sync error', err)
    } finally {
      this.syncing = false
    }
  }

  async syncDfiUsdPair (): Promise<void> {
    const pair = await this.getPoolPair('DFI', 'USDT')
    if (pair === undefined) {
      return
    }

    if (pair.idTokenA === '0') {
      this.USDT_PER_DFI = new BigNumber(pair['reserveB/reserveA'])
    } else if (pair.idTokenB === '0') {
      this.USDT_PER_DFI = new BigNumber(pair['reserveA/reserveB'])
    }
  }

  /**
   * Get PoolPair where the order of token doesn't matter
   */
  private async getPoolPair (a: string, b: string): Promise<PoolPairInfo | undefined> {
    try {
      const result = await this.rpcClient.poolpair.getPoolPair(`${a}-${b}`, true)
      if (Object.values(result).length > 0) {
        return Object.values(result)[0]
      }
    } catch (err) {
      if (err?.payload?.message !== 'Pool not found') {
        throw err
      }
    }

    try {
      const result = await this.rpcClient.poolpair.getPoolPair(`${b}-${a}`, true)
      if (Object.values(result).length > 0) {
        return Object.values(result)[0]
      }
    } catch (err) {
      if (err?.payload?.message !== 'Pool not found') {
        throw err
      }
    }
  }

  /**
   * TODO(fuxingloh): graph based matrix resolution
   * Currently implemented with fix pair derivation
   * Ideally should use vertex directed graph where we can always find total liquidity if it can be resolved.
   */
  getTotalLiquidityUsd (info: PoolPairInfo): BigNumber | undefined {
    if (this.USDT_PER_DFI === undefined) {
      return
    }

    const [a, b] = info.symbol.split('-')
    if (a === 'DFI') {
      return info.reserveA.multipliedBy(2).multipliedBy(this.USDT_PER_DFI)
    }

    if (b === 'DFI') {
      return info.reserveB.multipliedBy(2).multipliedBy(this.USDT_PER_DFI)
    }
  }
}
