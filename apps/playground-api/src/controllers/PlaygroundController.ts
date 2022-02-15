import { Controller, Get } from '@nestjs/common'
import { ApiClient } from '@defichain/jellyfish-api-core'

export interface Info {
  block: {
    count: number
    hash: string
  }
}

@Controller('/v0/playground')
export class PlaygroundController {
  constructor (private readonly client: ApiClient) {
  }

  @Get('/info')
  async info (): Promise<Info> {
    const info = await this.client.blockchain.getBlockchainInfo()
    return {
      block: {
        count: info.blocks,
        hash: info.bestblockhash
      }
    }
  }
}
