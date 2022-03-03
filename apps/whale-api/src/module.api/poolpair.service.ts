import { Injectable, NotFoundException } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import BigNumber from 'bignumber.js'
import { PoolPairInfo } from '@defichain/jellyfish-api-core/dist/category/poolpair'
import { SemaphoreCache } from '@src/module.api/cache/semaphore.cache'
import { PoolPairData } from '@whale-api-client/api/poolpairs'
import { getBlockSubsidy } from '@src/module.api/subsidy'
import { BlockMapper } from '@src/module.model/block'
import { TokenMapper } from '@src/module.model/token'
import { PoolSwapAggregated, PoolSwapAggregatedMapper } from '@src/module.model/pool.swap.aggregated'
import { PoolSwapAggregatedInterval } from '@src/module.indexer/model/dftx/pool.swap.aggregated'

@Injectable()
export class PoolPairService {
  constructor (
    protected readonly rpcClient: JsonRpcClient,
    protected readonly cache: SemaphoreCache,
    protected readonly poolSwapAggregatedMapper: PoolSwapAggregatedMapper,
    protected readonly tokenMapper: TokenMapper,
    protected readonly blockMapper: BlockMapper
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
      // const dusd = await this.getPoolPair('DFI', 'DUSD')
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

      // if (dusd !== undefined) {
      //   add(dusd)
      // }

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

  private async getTokenUSDValue (id: number): Promise<BigNumber | undefined> {
    return await this.cache.get<BigNumber>(`PRICE_FOR_TOKEN_${id}`, async () => {
      const tokenInfo = await this.tokenMapper.getByTokenId(id)
      const token = tokenInfo?.symbol

      if (token === undefined) {
        throw new NotFoundException('Unable to find token symbol')
      }

      if (['DUSD', 'USDT', 'USDC'].includes(token)) {
        return new BigNumber(1)
      }

      const dusdPair = await this.getPoolPair(token, 'DUSD')
      if (dusdPair !== undefined) {
        // Intentionally only checking against first symbol, to avoid issues
        // with symbol name truncation
        if (dusdPair.symbol.split('-')[0] !== 'DUSD') {
          return dusdPair.reserveB.div(dusdPair.reserveA)
        }
        return dusdPair.reserveA.div(dusdPair.reserveB)
      }

      const dfiPair = await this.getPoolPair(token, 'DFI')
      if (dfiPair !== undefined) {
        const usdPerDFI = await this.getUSD_PER_DFI() ?? 0
        if (dfiPair.idTokenA === '0') {
          return dfiPair.reserveA.div(dfiPair.reserveB).times(usdPerDFI)
        }
        return dfiPair.reserveB.div(dfiPair.reserveA).times(usdPerDFI)
      }
    }, {
      ttl: 300 // 5 minutes
    })
  }

  public async getUSDVolume (id: string): Promise<PoolPairData['volume'] | undefined> {
    return await this.cache.get<PoolPairData['volume']>(`POOLPAIR_VOLUME_${id}`, async () => {
      const gatherAmount = async (interval: PoolSwapAggregatedInterval, count: number): Promise<number> => {
        const aggregated: Record<string, number> = {}
        const swaps = await this.poolSwapAggregatedMapper.query(`${id}-${interval as number}`, count)
        for (const swap of swaps) {
          for (const tokenId in swap.aggregated.amounts) {
            const fromAmount = new BigNumber(swap.aggregated.amounts[tokenId])
            aggregated[tokenId] = aggregated[tokenId] === undefined
              ? fromAmount.toNumber()
              : aggregated[tokenId] + fromAmount.toNumber()
          }
        }

        let volume = 0
        for (const tokenId in aggregated) {
          const tokenPrice = await this.getTokenUSDValue(parseInt(tokenId)) ?? new BigNumber(0)
          volume += tokenPrice.toNumber() * aggregated[tokenId]
        }

        return volume
      }

      return {
        h24: await gatherAmount(PoolSwapAggregatedInterval.ONE_HOUR, 24),
        d30: await gatherAmount(PoolSwapAggregatedInterval.ONE_DAY, 30)
      }
    }, {
      ttl: 900 // 15 minutes
    })
  }

  public async getAggregatedInUSD ({ aggregated: { amounts } }: PoolSwapAggregated): Promise<number> {
    let value = 0

    for (const tokenId in amounts) {
      const tokenPrice = await this.getTokenUSDValue(parseInt(tokenId)) ?? new BigNumber(0)
      value += tokenPrice.toNumber() * Number.parseFloat(amounts[tokenId])
    }
    return value
  }

  private async getLoanTokenSplits (): Promise<Record<string, number> | undefined> {
    return await this.cache.get<Record<string, number>>('LP_LOAN_TOKEN_SPLITS', async () => {
      const result = await this.rpcClient.masternode.getGov('LP_LOAN_TOKEN_SPLITS')
      return result.LP_LOAN_TOKEN_SPLITS
    }, {
      ttl: 600 // 10 minutes
    })
  }

  private async getLoanEmission (): Promise<BigNumber | undefined> {
    return await this.cache.get<BigNumber>('LP_LOAN_TOKEN_EMISSION', async () => {
      const info = await this.rpcClient.blockchain.getBlockchainInfo()
      const eunosHeight = info.softforks.eunos.height ?? 0
      return getBlockSubsidy(eunosHeight, info.blocks).multipliedBy('0.2468')
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

    const dfiPriceUSD = await this.getUSD_PER_DFI()
    const dailyDfiReward = await this.getDailyDFIReward()

    if (dfiPriceUSD === undefined || dailyDfiReward === undefined) {
      return undefined
    }

    return info.rewardPct
      .times(dailyDfiReward)
      .times(365)
      .times(dfiPriceUSD)
  }

  private async getYearlyRewardLoanUSD (id: string): Promise<BigNumber | undefined> {
    const splits = await this.getLoanTokenSplits()
    if (splits === undefined) {
      return new BigNumber(0)
    }

    const split = splits[id]
    if (split === undefined) {
      return new BigNumber(0)
    }

    const dfiPriceUSD = await this.getUSD_PER_DFI()
    if (dfiPriceUSD === undefined) {
      return undefined
    }

    const loanEmission = await this.getLoanEmission()
    if (loanEmission === undefined) {
      return new BigNumber(0)
    }

    return loanEmission.multipliedBy(split)
      .times(60 * 60 * 24 / 30) // 30 seconds = 1 block
      .times(365) // 1 year
      .times(dfiPriceUSD)
  }

  /**
   * Estimate yearly commission rate by taking 24 hour commission x 365 days
   */
  private async getYearlyCommissionEstimate (id: string, info: PoolPairInfo): Promise<BigNumber> {
    const volume = await this.getUSDVolume(id)
    return info.commission.times(volume?.h24 ?? 0).times(365)
  }

  async getAPR (id: string, info: PoolPairInfo): Promise<PoolPairData['apr'] | undefined> {
    const customUSD = await this.getYearlyCustomRewardUSD(info)
    const pctUSD = await this.getYearlyRewardPCTUSD(info)
    const loanUSD = await this.getYearlyRewardLoanUSD(id)
    const totalLiquidityUSD = await this.getTotalLiquidityUsd(info)

    if (customUSD === undefined || pctUSD === undefined || loanUSD === undefined || totalLiquidityUSD === undefined) {
      return undefined
    }

    const yearlyUSD = customUSD.plus(pctUSD).plus(loanUSD)
    // 1 == 100%, 0.1 = 10%
    const reward = yearlyUSD.div(totalLiquidityUSD)

    const yearlyCommission = await this.getYearlyCommissionEstimate(id, info)
    const commission = yearlyCommission.div(totalLiquidityUSD)

    return {
      reward: reward.toNumber(),
      commission: commission.toNumber(),
      total: reward.plus(commission).toNumber()
    }
  }
}
