import { Controller, ForbiddenException, Get, Query, Param } from '@nestjs/common'
import { ConsortiumService } from './consortium.service'
import { ConsortiumTransactionResponse, AssetBreakdownInfo, MemberStatsInfo } from '@defichain/whale-api-client/dist/api/consortium'
import { SemaphoreCache } from '@defichain-apps/libs/caches'

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
    @Query() query: { pageIndex?: number, limit?: number, searchTerm?: string }
  ): Promise<ConsortiumTransactionResponse> {
    const { pageIndex = 0, limit = 20, searchTerm = undefined } = query

    if (limit > 50 || limit < 1) {
      throw new ForbiddenException('InvalidLimit')
    }

    if (searchTerm !== undefined && (searchTerm.length < 3 || searchTerm.length > 64)) {
      throw new ForbiddenException('InvalidSearchTerm')
    }

    if (pageIndex < 0) {
      throw new ForbiddenException('InvalidPageIndex')
    }

    return await this.cache.get<ConsortiumTransactionResponse>(`CONSORTIUM_TRANSACTIONS_${JSON.stringify({ pageIndex, limit, searchTerm })}`, async () => {
      return await this.consortiumService.getTransactionHistory(+pageIndex, +limit, typeof searchTerm === 'string' ? searchTerm : '')
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
