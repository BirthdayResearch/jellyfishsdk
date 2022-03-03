import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common'
import { OraclePriceAggregated, OraclePriceAggregatedMapper } from '../module.model/oracle.price.aggregated'
import { OracleTokenCurrencyMapper } from '../module.model/oracle.token.currency'
import { ApiPagedResponse } from '../module.api/_core/api.paged.response'
import { PaginationQuery } from '../module.api/_core/api.query'
import { PriceTicker, PriceTickerMapper } from '../module.model/price.ticker'
import { PriceOracle } from '@defichain/whale-api-client'
import { OraclePriceFeedMapper } from '../module.model/oracle.price.feed'
import { OraclePriceActive, OraclePriceActiveMapper } from '../module.model/oracle.price.active'
import { ApiError } from '../module.api/_core/api.error'

@Controller('/prices')
export class PriceController {
  constructor (
    protected readonly oraclePriceAggregatedMapper: OraclePriceAggregatedMapper,
    protected readonly oracleTokenCurrencyMapper: OracleTokenCurrencyMapper,
    protected readonly priceTickerMapper: PriceTickerMapper,
    protected readonly priceFeedMapper: OraclePriceFeedMapper,
    protected readonly oraclePriceActiveMapper: OraclePriceActiveMapper
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
  ): Promise<ApiPagedResponse<any>> {
    return new DeprecatedIntervalApiPagedResponse()
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

class DeprecatedIntervalApiPagedResponse<T> extends ApiPagedResponse<T> {
  error?: ApiError

  constructor () {
    super([])
    this.error = {
      at: Date.now(),
      code: 410,
      type: 'Gone',
      message: 'Oracle feed interval data has been deprecated with immediate effect. See https://github.com/DeFiCh/whale/pull/749 for more information.',
      url: '/:key/feed/interval/:interval'
    }
  }
}
