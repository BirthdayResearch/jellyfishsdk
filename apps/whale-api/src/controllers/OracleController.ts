import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common'

import { ApiPagedResponse } from '../core/ApiPagedResponse'
import { PaginationQuery } from '../core/PaginationQuery'
import { Oracle, OracleMapper } from '../models/Oracle'
import { OraclePriceFeed, OraclePriceFeedMapper } from '../models/OraclePriceFeed'

@Controller('/oracles')
export class OracleController {
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

  @Get('/:oracleAddress')
  async getOracleByAddress (
    @Param('oracleAddress') address: string
  ): Promise<Oracle> {
    const items = await this.oracleMapper.query(Number.MAX_SAFE_INTEGER)
    for (const oracle of items) {
      if (oracle.ownerAddress === address) {
        return oracle
      }
    }

    throw new NotFoundException(`Oracle not found for address ${address}`)
  }
}
