import { Injectable } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import BigNumber from 'bignumber.js'
import { PoolPairInfo } from '@defichain/jellyfish-api-core/dist/category/poolpair'
import { SemaphoreCache } from '@src/module.api/cache/semaphore.cache'

@Injectable()
export class PoolPairService {
  private readonly USDT_PER_DFI: BigNumber | undefined

  constructor (
    protected readonly rpcClient: JsonRpcClient,
    protected readonly cache: SemaphoreCache
  ) {
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
  async getTotalLiquidityUsd (info: PoolPairInfo): Promise<BigNumber | undefined> {
    const USDT_PER_DFI = await this.getUSDT_PER_DFI()
    if (USDT_PER_DFI === undefined) {
      return
    }

    const [a, b] = info.symbol.split('-')
    if (a === 'DFI') {
      return info.reserveA.multipliedBy(2).multipliedBy(USDT_PER_DFI)
    }

    if (b === 'DFI') {
      return info.reserveB.multipliedBy(2).multipliedBy(USDT_PER_DFI)
    }
  }

  private async getUSDT_PER_DFI (): Promise<BigNumber | undefined> {
    return await this.cache.get<BigNumber>('USDT_PER_DFI', async () => {
      const pair = await this.getPoolPair('DFI', 'USDT')
      if (pair !== undefined) {
        if (pair.idTokenA === '0') {
          return new BigNumber(pair['reserveB/reserveA'])
        } else if (pair.idTokenB === '0') {
          return new BigNumber(pair['reserveA/reserveB'])
        }
      }
    }, {
      ttl: 180
    })
  }
}
