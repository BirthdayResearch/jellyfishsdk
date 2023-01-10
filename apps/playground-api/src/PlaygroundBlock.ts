import { Interval } from '@nestjs/schedule'
import { Injectable, Logger } from '@nestjs/common'
import { ApiClient } from '@defichain/jellyfish-api-core'
import { MiningInfo } from '@defichain/jellyfish-api-core/dist/category/mining'

@Injectable()
export class PlaygroundBlock {
  private readonly logger = new Logger(PlaygroundBlock.name)

  constructor (private readonly client: ApiClient) {
  }

  @Interval(3000)
  async generate (): Promise<void> {
    const { masternodes }: MiningInfo = await this.client.mining.getMiningInfo()
    const randomAddress = masternodes[Math.floor(Math.random() * masternodes.length)].operator
    await this.client.call('generatetoaddress', [1, randomAddress, 1], 'number')
    const count = await this.client.blockchain.getBlockCount()
    this.logger.log(`generated new block - height: ${count}`)
  }
}
