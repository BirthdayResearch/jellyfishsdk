import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common'
import { OraclePriceAggregated, OraclePriceAggregatedMapper } from '../model/OraclePriceAggregated'
import { OracleTokenCurrencyMapper } from '../model/OracleTokenCurrency'
import { OraclePriceAggregatedIntervalMapper } from '../model/OraclePriceAggregatedInterval'
import { ApiPagedResponse } from './_core/ApiPagedResponse'
import { PaginationQuery } from './_core/ApiQuery'
import { PriceTicker, PriceTickerMapper } from '../model/PriceTicker'
import { PriceFeedInterval, PriceOracle } from '@defichain/whale-api-client/src/api/Prices'
import { OraclePriceFeedMapper } from '../model/OraclePriceFeed'
import { OraclePriceActive, OraclePriceActiveMapper } from '../model/OraclePriceActive'

@Controller('/prices')
export class PriceController {
  constructor (
    protected readonly oraclePriceAggregatedMapper: OraclePriceAggregatedMapper,
    protected readonly oracleTokenCurrencyMapper: OracleTokenCurrencyMapper,
    protected readonly priceTickerMapper: PriceTickerMapper,
    protected readonly priceFeedMapper: OraclePriceFeedMapper,
    protected readonly oraclePriceActiveMapper: OraclePriceActiveMapper,
    protected readonly oraclePriceAggregatedIntervalMapper: OraclePriceAggregatedIntervalMapper
  ) {
  }

  @Get()
  async list (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<PriceTicker>> {
    const items = await this.priceTickerMapper.query(query.size, query.next)
    return ApiPagedResponse.of(items, query.size, item => {
      return item.sort
    })
  }

  @Get('/:key')
  async get (
    @Param('key') key: string
  ): Promise<PriceTicker | undefined> {
    return await this.priceTickerMapper.get(key)
  }

  @Get('/:key/feed')
  async getFeed (
    @Param('key') key: string,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<OraclePriceAggregated>> {
    const items = await this.oraclePriceAggregatedMapper.query(key, query.size, query.next)
    return ApiPagedResponse.of(items, query.size, item => {
      return item.sort
    })
  }

  @Get('/:key/feed/active')
  async getFeedActive (
    @Param('key') key: string,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<OraclePriceActive>> {
    const items = await this.oraclePriceActiveMapper.query(key, query.size, query.next)
    return ApiPagedResponse.of(items, query.size, item => {
      return item.sort
    })
  }

  @Get('/:key/feed/interval/:interval')
  async getFeedWithInterval (
    @Param('key') key: string,
      @Param('interval', ParseIntPipe) interval: number,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<PriceFeedInterval>> {
    const priceKey = `${key}-${interval}`
    const items = await this.oraclePriceAggregatedIntervalMapper.query(priceKey, query.size, query.next)

    const mapped: PriceFeedInterval[] = items.map(item => {
      const start = item.block.medianTime - (item.block.medianTime % interval)

      return {
        ...item,
        aggregated: {
          ...item.aggregated,
          time: {
            interval: interval,
            start: start,
            end: start + interval
          }
        }
      }
    })

    return ApiPagedResponse.of(mapped, query.size, item => {
      return item.sort
    })
  }

  @Get('/:key/oracles')
  async listPriceOracles (
    @Param('key') key: string,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<PriceOracle>> {
    const items: PriceOracle[] = await this.oracleTokenCurrencyMapper.query(key, query.size, query.next)

    // TODO(fuxingloh): need to index PriceOracle, this is not performant due to random read
    for (const item of items) {
      const feeds = await this.priceFeedMapper.query(`${key}-${item.oracleId}`, 1)
      item.feed = feeds.length > 0 ? feeds[0] : undefined
    }

    return ApiPagedResponse.of(items, query.size, item => {
      return item.oracleId
    })
  }
}
