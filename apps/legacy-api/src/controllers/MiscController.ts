import { Controller, Get, NotFoundException, Query } from '@nestjs/common'
import { StatsData } from '@defichain/whale-api-client'
import { WhaleApiClientProvider } from '../providers/WhaleApiClientProvider'
import { NetworkValidationPipe, SupportedNetwork } from '../pipes/NetworkValidationPipe'
import { ValidateAddressResult } from '@defichain/jellyfish-api-core/src/category/wallet'

@Controller('v1')
export class MiscController {
  constructor (private readonly whaleApiClientProvider: WhaleApiClientProvider) {
  }

  @Get('getblockcount')
  async getToken (
    @Query('network', NetworkValidationPipe) network: SupportedNetwork = 'mainnet'
  ): Promise<{ [key: string]: Number }> {
    const api = this.whaleApiClientProvider.getClient(network)

    const data: StatsData = await api.stats.get()
    return {
      data: data.count.blocks
    }
  }

  @Get('validateaddress')
  async validateAddress (
    @Query('network', NetworkValidationPipe) network: SupportedNetwork = 'mainnet',
    @Query('address') address: string
  ): Promise<{ data: Partial<ValidateAddressResult> }> {
    const api = this.whaleApiClientProvider.getClient(network)
    const rpcResult = await api.rpc.call<ValidateAddressResult>('validateaddress', [address], 'number')

    const response: Partial<ValidateAddressResult> = { isvalid: rpcResult.isvalid }
    if (rpcResult.isvalid) {
      response.isvalid = rpcResult.isvalid
      response.address = rpcResult.address
      response.scriptPubKey = rpcResult.scriptPubKey
      response.isscript = rpcResult.isscript
      response.iswitness = rpcResult.iswitness
    }

    return { data: response }
  }

  @Get('getgov')
  async getGov (
    @Query('network', NetworkValidationPipe) network: SupportedNetwork = 'mainnet',
    @Query('name') name: 'LP_DAILY_DFI_REWARD' | 'LP_SPLITS'
  ): Promise<Record<string, any>> {
    const api = this.whaleApiClientProvider.getClient(network)

    if (name !== 'LP_DAILY_DFI_REWARD' && name !== 'LP_SPLITS') {
      throw new NotFoundException()
    }

    const rpcResult = await api.rpc.call<Record<string, any>>('getgov', [name], 'bignumber')

    // e.g. { "LP_DAILY_DFI_REWARD": "123" }
    return { [name]: rpcResult[name] }
  }
}
