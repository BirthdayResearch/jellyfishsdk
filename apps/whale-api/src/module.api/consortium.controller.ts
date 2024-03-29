import { Controller, Get, Param } from '@nestjs/common'
import { ConsortiumService } from './consortium.service'
import { SemaphoreCache } from '@defichain-apps/libs/caches'
import { AssetBreakdownInfo, MemberStatsInfo } from '@defichain/whale-api-client/dist/api/consortium'

@Controller('/consortium')
export class ConsortiumController {
  constructor (
    protected readonly consortiumService: ConsortiumService,
    protected readonly cache: SemaphoreCache
  ) {}

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
