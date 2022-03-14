import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common'

import { PriceOracle } from '@defichain/whale-api-client/src/api/prices'

import { ApiError } from '../core/ApiError'
import { ApiPagedResponse } from '../core/ApiPagedResponse'
import { PaginationQuery } from '../core/PaginationQuery'
import { OraclePriceActive, OraclePriceActiveMapper } from '../models/OraclePriceActive'
import { OraclePriceAggregated, OraclePriceAggregatedMapper } from '../models/OraclePriceAggregated'
import { OraclePriceFeedMapper } from '../models/OraclePriceFeed'
import { OracleTokenCurrencyMapper } from '../models/OracleTokenCurrency'
import { PriceTicker, PriceTickerMapper } from '../models/PriceTicker'

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
