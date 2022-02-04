import { Controller, Get, Query } from '@nestjs/common'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { StatsData } from '@defichain/whale-api-client/dist/api/stats'
import { fromAddress } from '@defichain/jellyfish-address'

// For current Stats api endpoints: https://github.com/cakedefi/defi-stats-api/blob/ef46b74cc929003eb72fc39942049efc8681bf66/src/config/v1/v1.controller.ts

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

  @Get('validateAddress')
  async validateAddress (
    @Query('network') network: 'mainnet' | 'testnet' | 'regtest' = 'mainnet',
    @Query('address') address: string
  ): Promise<{ [key: string]: Number }> {
    console.log(fromAddress(address, network))
    return {
      data: 0
    }
  }
}
