import { Controller, Get } from '@nestjs/common'
import { ConsortiumService } from './consortium.service'
import { SemaphoreCache } from '@defichain-apps/libs/caches'
import { AssetBreakdownInfo } from '@defichain/whale-api-client/dist/api/consortium'

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
}
