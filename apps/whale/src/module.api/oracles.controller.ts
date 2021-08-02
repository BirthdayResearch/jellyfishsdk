import { Controller, Get, Param, Query } from '@nestjs/common'
import { Oracle, OracleMapper } from '@src/module.model/oracle'
import { OraclePriceFeed, OraclePriceFeedMapper } from '@src/module.model/oracle.price.feed'
import { ApiPagedResponse } from '@src/module.api/_core/api.paged.response'
import { PaginationQuery } from '@src/module.api/_core/api.query'

@Controller('/oracles')
export class OraclesController {
  constructor (
    protected readonly oracleMapper: OracleMapper,
    protected readonly oraclePriceFeedMapper: OraclePriceFeedMapper
  ) {
  }

  @Get()
  async list (
    @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<Oracle>> {
    const items = await this.oracleMapper.query(query.size, query.next)
    return ApiPagedResponse.of(items, query.size, item => {
      return item.id
    })
  }

  @Get('/:oracleId/:key/feed')
  async getPriceFeed (
    @Param('oracleId') oracleId: string,
      @Param('key') key: string,
      @Query() query: PaginationQuery
  ): Promise<ApiPagedResponse<OraclePriceFeed>> {
    const items = await this.oraclePriceFeedMapper.query(`${key}-${oracleId}`, query.size, query.next)
    return ApiPagedResponse.of(items, query.size, item => {
      return item.sort
    })
  }
}
