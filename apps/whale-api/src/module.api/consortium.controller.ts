import { Controller, Get, Query, Param } from '@nestjs/common'
import { ConsortiumService } from './consortium.service'
import { ConsortiumTransactionResponse, AssetBreakdownInfo, MemberStatsInfo } from '@defichain/whale-api-client/dist/api/consortium'
import { SemaphoreCache } from '@defichain-apps/libs/caches'
import { PaginationQuery } from './_core/api.query'
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

class TransactionHistoryPaginationQuery extends PaginationQuery {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  searchTerm?: string
}

@Controller('/consortium')
export class ConsortiumController {
  constructor (
    protected readonly consortiumService: ConsortiumService,
    protected readonly cache: SemaphoreCache
  ) {}

  /**
   *  Gets the transaction history of consortium members.
   *
   * @return {Promise<ConsortiumTransactionResponse>}
    */
  @Get('/transactions')
  async getTransactionHistory (
    @Query() query: TransactionHistoryPaginationQuery = { size: 50 }
  ): Promise<ConsortiumTransactionResponse> {
    const { searchTerm = '' } = query
    const next = query.next !== undefined ? Number(query.next) : 0
    const size = Math.min(query.size, 50)

    return await this.cache.get<ConsortiumTransactionResponse>(`CONSORTIUM_TRANSACTIONS_${JSON.stringify({ next, size, searchTerm })}`, async () => {
      return await this.consortiumService.getTransactionHistory(next, size, searchTerm)
    }, {
      ttl: 600 // 10 mins
    }) as ConsortiumTransactionResponse
  }

  /**
   *  Gets the asset breakdown information of consortium members.
   *
   * @return {Promise<AssetBreakdownInfo[]>}
    */
  @Get('/assetbreakdown')
  async getAssetBreakdown (): Promise<AssetBreakdownInfo[]> {
    return await this.cache.get<AssetBreakdownInfo[]>('CONSORTIUM_ASSET_BREAKDOWN', async () => {
      return await this.consortiumService.getAssetBreakdown()
    }, {
      ttl: 600 // 10 minutes
    }) as AssetBreakdownInfo[]
  }

  /**
   *  Gets the stats information of a specific consortium member
   *
   * @return {Promise<MemberStatsInfo>}
    */
  @Get('/stats/:memberid')
  async getMemberStats (@Param('memberid') memberId: string): Promise<MemberStatsInfo> {
    return await this.cache.get<MemberStatsInfo>('CONSORTIUM_MEMBER_STATS', async () => {
      return await this.consortiumService.getMemberStats(memberId)
    }, {
      ttl: 300 // 5 minutes
    }) as MemberStatsInfo
  }
}
