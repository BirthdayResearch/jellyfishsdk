import { Interval } from '@nestjs/schedule'
import { Injectable, Logger } from '@nestjs/common'
import { ApiClient } from '@defichain/jellyfish-api-core'
import { PlaygroundSetup } from './setups/setup'

@Injectable()
export class PlaygroundBlock {
  private readonly logger = new Logger(PlaygroundBlock.name)

  constructor (private readonly client: ApiClient) {
  }

  @Interval(3000)
  async generate (): Promise<void> {
    await this.client.call('generatetoaddress', [1, PlaygroundSetup.address, 1], 'number')
    const count = await this.client.blockchain.getBlockCount()
    this.logger.log(`generated new block - height: ${count}`)
  }
}
