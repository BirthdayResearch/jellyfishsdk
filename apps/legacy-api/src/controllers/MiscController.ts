import { Controller, Get, Query } from '@nestjs/common'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { StatsData } from '@defichain/whale-api-client/dist/api/stats'

@Controller('v1')
export class MiscController {
  @Get('getblockcount')
  async getToken (
    @Query('network') network: 'mainnet' | 'testnet' | 'regtest' = 'mainnet'
  ): Promise<{ [key: string]: Number }> {
    const api = new WhaleApiClient({
      version: 'v0',
      network: network,
      url: 'https://ocean.defichain.com'
    })

    const data: StatsData = await api.stats.get()
    return {
      data: data.count.blocks
    }
  }
}
