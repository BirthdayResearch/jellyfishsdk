import { Injectable } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import BigNumber from 'bignumber.js'
import { PoolPairInfo } from '@defichain/jellyfish-api-core/dist/category/poolpair'
import { SemaphoreCache } from '@src/module.api/cache/semaphore.cache'
import { PoolPairData } from '@whale-api-client/api/poolpairs'

@Injectable()
export class PoolPairService {
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
    const [a, b] = info.symbol.split('-')
    if (['DUSD', 'USDT', 'USDC'].includes(a)) {
      return info.reserveA.multipliedBy(2)
    }

    if (['DUSD', 'USDT', 'USDC'].includes(b)) {
      return info.reserveB.multipliedBy(2)
    }

    const USDT_PER_DFI = await this.getUSD_PER_DFI()
    if (USDT_PER_DFI === undefined) {
      return
    }

    if (a === 'DFI') {
      return info.reserveA.multipliedBy(2).multipliedBy(USDT_PER_DFI)
    }

    if (b === 'DFI') {
      return info.reserveB.multipliedBy(2).multipliedBy(USDT_PER_DFI)
    }
  }

  async getUSD_PER_DFI (): Promise<BigNumber | undefined> {
    return await this.cache.get<BigNumber>('USD_PER_DFI', async () => {
      const usdt = await this.getPoolPair('DFI', 'USDT')
      const usdc = await this.getPoolPair('DFI', 'USDC')
      let totalUSD = new BigNumber(0)
      let totalDFI = new BigNumber(0)

      function add (pair: PoolPairInfo): void {
        if (pair.idTokenA === '0') {
          totalUSD = totalUSD.plus(pair.reserveB)
          totalDFI = totalDFI.plus(pair.reserveA)
        } else if (pair.idTokenB === '0') {
          totalUSD = totalUSD.plus(pair.reserveA)
          totalDFI = totalDFI.plus(pair.reserveB)
        }
      }

      if (usdt !== undefined) {
        add(usdt)
      }

      if (usdc !== undefined) {
        add(usdc)
      }

      if (!totalUSD.isZero()) {
        return totalUSD.div(totalDFI)
      }
    }, {
      ttl: 180
    })
  }

  private async getDailyDFIReward (): Promise<BigNumber | undefined> {
    return await this.cache.get<BigNumber>('LP_DAILY_DFI_REWARD', async () => {
      const rpcResult = await this.rpcClient.masternode.getGov('LP_DAILY_DFI_REWARD')
      return new BigNumber(rpcResult.LP_DAILY_DFI_REWARD)
    }, {
      ttl: 3600 // 60 minutes
    })
  }

  private async getYearlyCustomRewardUSD (info: PoolPairInfo): Promise<BigNumber | undefined> {
    if (info.customRewards === undefined) {
      return new BigNumber(0)
    }

    const dfiPriceUsdt = await this.getUSD_PER_DFI()
    if (dfiPriceUsdt === undefined) {
      return undefined
    }

    return info.customRewards.reduce<BigNumber>((accum, customReward) => {
      const [reward, token] = customReward.split('@')
      if (token !== '0' && token !== 'DFI') {
        // Unhandled if not DFI
        return accum
      }

      const yearly = new BigNumber(reward)
        .times(60 * 60 * 24 / 30) // 30 seconds = 1 block
        .times(365) // 1 year
        .times(dfiPriceUsdt)

      return accum.plus(yearly)
    }, new BigNumber(0))
  }

  private async getYearlyRewardPCTUSD (info: PoolPairInfo): Promise<BigNumber | undefined> {
    if (info.rewardPct === undefined) {
      return new BigNumber(0)
    }

    const dfiPriceUsdt = await this.getUSD_PER_DFI()
    const dailyDfiReward = await this.getDailyDFIReward()

    if (dfiPriceUsdt === undefined || dailyDfiReward === undefined) {
      return undefined
    }

    return info.rewardPct
      .times(dailyDfiReward)
      .times(365)
      .times(dfiPriceUsdt)
  }

  async getAPR (info: PoolPairInfo): Promise<PoolPairData['apr'] | undefined> {
    const customUSD = await this.getYearlyCustomRewardUSD(info)
    const pctUSD = await this.getYearlyRewardPCTUSD(info)
    const totalLiquidityUSD = await this.getTotalLiquidityUsd(info)

    if (customUSD === undefined || pctUSD === undefined || totalLiquidityUSD === undefined) {
      return undefined
    }

    const yearlyUSD = customUSD.plus(pctUSD)
    // 1 == 100%, 0.1 = 10%
    const apr = yearlyUSD.div(totalLiquidityUSD).toNumber()

    return {
      reward: apr,
      total: apr
    }
  }
}
