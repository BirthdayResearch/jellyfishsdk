import { Controller, Get } from '@nestjs/common'
import { StatsData } from '@whale-api-client/api/stats'
import { SemaphoreCache } from '@src/module.api/cache/semaphore.cache'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { BlockMapper } from '@src/module.model/block'
import { PoolPairService } from '@src/module.api/poolpair.service'
import BigNumber from 'bignumber.js'
import { PriceTickerMapper } from '@src/module.model/price.ticker'

@Controller('/stats')
export class StatsController {
  constructor (
    protected readonly blockMapper: BlockMapper,
    protected readonly priceTickerMapper: PriceTickerMapper,
    protected readonly poolPairService: PoolPairService,
    protected readonly rpcClient: JsonRpcClient,
    protected readonly cache: SemaphoreCache
  ) {
  }

  @Get()
  async get (): Promise<StatsData> {
    const block = await this.blockMapper.getHighest()
    const height = requireValue(block?.height, 'count.blocks')

    return {
      count: {
        ...await this.cachedGet('count', this.getCount.bind(this), 1800),
        blocks: height
      },
      burned: await this.cachedGet('burned', this.getBurned.bind(this), 1800),
      tvl: await this.cachedGet('tvl', this.getTVL.bind(this), 300),
      price: await this.cachedGet('price', this.getPrice.bind(this), 300)
    }
  }

  private async cachedGet<T> (field: string, fetch: () => Promise<T>, ttl: number): Promise<T> {
    const object = await this.cache.get(`StatsController.${field}`, fetch, { ttl })
    return requireValue(object, field)
  }

  private async getCount (): Promise<StatsData['count']> {
    const tokens = await this.rpcClient.token.listTokens({ including_start: true, start: 0, limit: 1000 }, false)
    const prices = await this.priceTickerMapper.query(1000)

    return {
      blocks: 0,
      prices: prices.length,
      tokens: Object.keys(tokens).length
    }
  }

  private async getTVL (): Promise<StatsData['tvl']> {
    let dex = new BigNumber(0)
    const pairs = await this.rpcClient.poolpair.listPoolPairs({ including_start: true, start: 0, limit: 1000 }, true)
    for (const pair of Object.values(pairs)) {
      const liq = await this.poolPairService.getTotalLiquidityUsd(pair)
      dex = dex.plus(requireValue(liq, `tvl.dex.${pair.symbol}`))
    }

    return {
      dex: dex.toNumber(),
      total: dex.toNumber()
    }
  }

  private async getBurned (): Promise<StatsData['burned']> {
    const { emissionburn, amount, feeburn } = await this.rpcClient.account.getBurnInfo()
    return {
      address: amount.toNumber(),
      emission: emissionburn.toNumber(),
      fee: feeburn.toNumber(),
      total: amount.plus(emissionburn).plus(feeburn).toNumber()
    }
  }

  private async getPrice (): Promise<StatsData['price']> {
    const usdt = await this.poolPairService.getUSDT_PER_DFI()
    return {
      usdt: requireValue(usdt, 'price.usdt').toNumber()
    }
  }
}

function requireValue<T> (value: T | undefined, name: string): T {
  if (value === undefined) {
    throw new Error(`failed to compute: ${name}`)
  }
  return value
}
