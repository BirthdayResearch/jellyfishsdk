import { Controller, Get, Query } from '@nestjs/common'
import { StatsData } from '@defichain/whale-api-client/dist/api/stats'
import { WhaleApiClientProvider } from '../providers/WhaleApiClientProvider'

@Controller('v1')
export class MiscController {
  constructor (private readonly whaleApiClientProvider: WhaleApiClientProvider) {}

  @Get('getblockcount')
  async getToken (
    @Query('network') network: 'mainnet' | 'testnet' | 'regtest' = 'mainnet'
  ): Promise<{ [key: string]: Number }> {
    const api = this.whaleApiClientProvider.getClient(network)

    const data: StatsData = await api.stats.get()
    return {
      data: data.count.blocks
    }
  }
}
