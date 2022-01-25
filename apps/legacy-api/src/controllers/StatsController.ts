import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common'
import { ApiClient, mining } from '@defichain/jellyfish-api-core'

// For current Stats api endpoints: https://github.com/cakedefi/defi-stats-api/blob/ef46b74cc929003eb72fc39942049efc8681bf66/src/config/v1/v1.controller.ts

@Controller('v1')
export class RawTxController {
  constructor (private readonly client: ApiClient) {
  }

  @Get('gettoken')
  async getToken (
    @Query('network') network: string = DEFAULT_NETWORK,
    @Query('id') tokenId: string,
  ): Promise<any> {
    return this.v1Service.getToken(network, tokenId)
  }
}
