import { Controller, Get, Query } from '@nestjs/common'
import { WhaleApiClientProvider } from '../providers/WhaleApiClientProvider'
import { NetworkValidationPipe, SupportedNetwork } from '../pipes/NetworkValidationPipe'
import { Block } from '@defichain/whale-api-client/src/api/Blocks'

@Controller('blockchain')
export class BlockchainController {
  constructor (private readonly whaleApiClientProvider: WhaleApiClientProvider) {
  }

  @Get('status')
  async getToken (
    @Query('network', NetworkValidationPipe) network: SupportedNetwork = 'mainnet'
  ): Promise<{ [key: string]: string }> {
    const api = this.whaleApiClientProvider.getClient(network)

    const blocks: Block[] = await api.blocks.list(1)

    const nowEpoch = Date.now()
    const latestBlockTime = blocks[0].time * 1000
    const timeDiff = nowEpoch - latestBlockTime

    let status: string

    if (timeDiff > 45 * 60 * 1000) {
      status = 'operational'
    } else if (timeDiff > 30 * 60 * 1000) {
      status = 'degraded'
    } else {
      status = 'operational'
    }

    return {
      data: status
    }
  }
}
