import { Controller, ForbiddenException, Get, Query } from '@nestjs/common'
import { ConsortiumService } from './consortium.service'
import { ConsortiumTransactionResponse, AssetBreakdownInfo } from '@defichain/whale-api-client/dist/api/consortium'
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
    @Query() query: { limit: number, search?: string, maxBlockHeight?: number }
  ): Promise<ConsortiumTransactionResponse> {
    const { limit = 20, search = undefined, maxBlockHeight = -1 } = query

    if (limit > 50 || limit < 1) {
      throw new ForbiddenException('InvalidLimit')
    }

    if (search !== undefined && (search.length < 3 || search.length > 64)) {
      throw new ForbiddenException('InvalidSearchTerm')
    }

    if (maxBlockHeight < -1) {
      throw new ForbiddenException('InvalidMaxBlockHeight')
    }

    return await this.cache.get<ConsortiumTransactionResponse>(`CONSORTIUM_TRANSACTIONS_${JSON.stringify(query)}`, async () => {
      return await this.consortiumService.getTransactionHistory(+limit, +maxBlockHeight, typeof search === 'string' ? search : '')
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
}
