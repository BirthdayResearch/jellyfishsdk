import { Controller, Get } from '@nestjs/common'
import { ConsortiumService } from './consortium.service'
import { AssetBreakdownInfo } from '@defichain/whale-api-client/dist/api/consortium'

@Controller('/consortium')
export class ConsortiumController {
  constructor (
    protected readonly consortiumService: ConsortiumService
  ) {}

  /**
   *  Gets the asset breakdown information of consortium members.
   *
   * @return {Promise<AssetBreakdownInfo[]>}
    */
  @Get('/assetbreakdown')
  async getAssetBreakdown (): Promise<AssetBreakdownInfo[]> {
    return await this.consortiumService.getAssetBreakdown()
  }
}
