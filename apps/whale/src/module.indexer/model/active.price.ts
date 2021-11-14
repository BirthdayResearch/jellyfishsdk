import { NetworkName } from '@defichain/jellyfish-network'
import { Inject, Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { OraclePriceActive, OraclePriceActiveMapper } from '@src/module.model/oracle.price.active'
import { OraclePriceAggregated, OraclePriceAggregatedMapper } from '@src/module.model/oracle.price.aggregated'
import { PriceTickerMapper } from '@src/module.model/price.ticker'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { PriceTicker } from '@whale-api-client/api/prices'
import BigNumber from 'bignumber.js'

@Injectable()
export class ActivePriceIndexer extends Indexer {
  BLOCK_INTERVAL: number
  DEVIATION_THRESHOLD: number = 0.3
  MINIMUM_LIVE_ORACLES: number = 2

  constructor (
    private readonly aggregatedMapper: OraclePriceAggregatedMapper,
    private readonly activePriceMapper: OraclePriceActiveMapper,
    private readonly priceTickerMapper: PriceTickerMapper,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
    super()
    this.BLOCK_INTERVAL = network === 'regtest' ? 6 : 120
  }

  async index (block: RawBlock): Promise<void> {
    if (block.height % this.BLOCK_INTERVAL !== 0) {
      return
    }

    const tickers: PriceTicker[] = await this.priceTickerMapper.query(Number.MAX_SAFE_INTEGER)
    for (const ticker of tickers) {
      const aggregatedPrices = await this.aggregatedMapper.query(ticker.id, 1)
      if (aggregatedPrices.length < 1) {
        continue
      }

      const previousPrices = await this.activePriceMapper.query(ticker.id, 1)
      await this.activePriceMapper.put(this.mapActivePrice(block, ticker, aggregatedPrices[0], previousPrices[0]))
    }
  }

  private mapActivePrice (
    block: RawBlock,
    ticker: PriceTicker,
    aggregatedPrice: OraclePriceAggregated,
    previousActive?: OraclePriceActive
  ): OraclePriceActive {
    const nextPrice = this.isAggregateValid(aggregatedPrice.aggregated) ? aggregatedPrice.aggregated : undefined
    const activePrice = previousActive?.next !== undefined ? previousActive.next : previousActive?.active

    return {
      id: `${ticker.id}-${block.height}`,
      key: ticker.id,
      isLive: this.isLive(activePrice, nextPrice),
      block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time },
      active: activePrice,
      next: nextPrice,
      sort: HexEncoder.encodeHeight(block.height)
    }
  }

  private isLive (active: OraclePriceActive['active'], next: OraclePriceActive['next']): boolean {
    if (active === undefined || next === undefined) {
      return false
    }

    const activePrice = new BigNumber(active.amount)
    const nextPrice = new BigNumber(next.amount)

    if (!activePrice.gt(0)) {
      return false
    }

    if (!nextPrice.gt(0)) {
      return false
    }

    if (!nextPrice.minus(activePrice).abs().lt(activePrice.times(this.DEVIATION_THRESHOLD))) {
      return false
    }

    return true
  }

  private isAggregateValid (aggregate: OraclePriceActive['next']): boolean {
    if (aggregate?.oracles === undefined) {
      return false
    }

    if (aggregate?.oracles.active < this.MINIMUM_LIVE_ORACLES) {
      return false
    }

    if (aggregate?.weightage <= 0) {
      return false
    }
    return true
  }

  async invalidate (block: RawBlock): Promise<void> {
    if (block.height % this.BLOCK_INTERVAL !== 0) {
      return
    }

    const tickers = await this.priceTickerMapper.query(Number.MAX_SAFE_INTEGER)
    for (const ticker of tickers) {
      await this.activePriceMapper.delete(`${ticker.id}-${block.height}`)
    }
  }
}
