import { Controller, Get } from '@nestjs/common'
import { Block } from '@defichain/whale-api-client/src/api/Blocks'
import { WhaleApiClient } from '@defichain/whale-api-client'

@Controller('blockchain')
export class BlockchainController {
  constructor (private readonly client: WhaleApiClient) {
  }

  @Get('status')
  async getToken (): Promise<{ [key: string]: string }> {
    const blocks: Block[] = await this.client.blocks.list(1)

    const nowEpoch = Date.now()
    const latestBlockTime = blocks[0].time * 1000
    const timeDiff = nowEpoch - latestBlockTime

    const statusMap = new Map<string, number>([
      ['outage', (45 * 60 * 1000)],
      ['degraded', (30 * 60 * 1000)],
      ['operational', 0]
    ])

    let currentStatus: string = 'operational'

    for (const [status, thresholdTime] of statusMap) {
      if (timeDiff > thresholdTime) {
        currentStatus = status
        break
      }
    }

    return {
      status: currentStatus
    }
  }
}
