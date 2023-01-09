import { Interval } from '@nestjs/schedule'
import { Injectable, Logger } from '@nestjs/common'
import { ApiClient } from '@defichain/jellyfish-api-core'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'

@Injectable()
export class PlaygroundBlock {
  private readonly logger = new Logger(PlaygroundBlock.name)

  constructor (private readonly client: ApiClient) {
  }

  private static randomNodeAddress (): string {
    return RegTestFoundationKeys[Math.floor(Math.random() * RegTestFoundationKeys.length)].operator.address
  }

  @Interval(3000)
  async generate (): Promise<void> {
    const address = PlaygroundBlock.randomNodeAddress()
    await this.client.call('generatetoaddress', [1, PlaygroundBlock.randomNodeAddress(), 1], 'number')
    const count = await this.client.blockchain.getBlockCount()
    this.logger.log(`generated new block using ${address} master node address - height: ${count}`)
  }
}
