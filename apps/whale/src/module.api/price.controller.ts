import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common'
import { OraclePriceAggregated, OraclePriceAggregatedMapper } from '@src/module.model/oracle.price.aggregated'
import { OracleTokenCurrencyMapper } from '@src/module.model/oracle.token.currency'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PaginationQuery } from '@src/module.api/_core/api.query'
import { PriceTicker, PriceTickerMapper } from '@src/module.model/price.ticker'
import { PriceOracle } from '@whale-api-client/api/prices'
import { OraclePriceFeedMapper } from '@src/module.model/oracle.price.feed'
import { OraclePriceAggregatedInterval, OraclePriceAggregatedIntervalMapper } from '@src/module.model/oracle.price.aggregated.interval'

@Controller('/prices')
export class PriceController {
  constructor (
    protected readonly oraclePriceAggregatedMapper: OraclePriceAggregatedMapper,
    protected readonly oracleTokenCurrencyMapper: OracleTokenCurrencyMapper,
    protected readonly priceTickerMapper: PriceTickerMapper,
    protected readonly priceFeedMapper: OraclePriceFeedMapper,
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

  @Get('/:key/feed/interval/:interval')
  async getFeedWithInterval (
    @Param('key') key: string,
      @Param('interval', ParseIntPipe) interval: number,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<OraclePriceAggregatedInterval>> {
    const priceKey = `${key}-${interval}`
    const items = await this.oraclePriceAggregatedIntervalMapper.query(priceKey, query.size, query.next)
    return ApiPagedResponse.of(items, query.size, item => {
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
