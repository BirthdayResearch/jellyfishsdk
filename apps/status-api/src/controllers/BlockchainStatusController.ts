import { Controller, Get } from '@nestjs/common'
import { Block } from '@defichain/whale-api-client/dist/api/blocks'
import { WhaleApiClient } from '@defichain/whale-api-client'

@Controller('blockchain')
export class BlockchainStatusController {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   *
   * To provide the status of the blockchain based on the block creation time interval
   *
   * @return {Promise<BlockchainStatus>}
   */
  @Get()
  async getBlockChainStatus (): Promise<{ status: BlockchainStatus }> {
    const blocks: Block[] = await this.client.blocks.list(1)

    const nowEpoch = Date.now()
    const latestBlockTime = blocks[0].time * 1000
    const timeDiff = nowEpoch - latestBlockTime

    let currentStatus: BlockchainStatus = 'operational'

    for (const [status, thresholdTime] of Object.entries(StatusToThresholdInMs)) {
      if (timeDiff > thresholdTime) {
        currentStatus = status as BlockchainStatus
        break
      }
    }

    return {
      status: currentStatus
    }
  }
}

export type BlockchainStatus = 'outage' | 'degraded' | 'operational'

export const StatusToThresholdInMs: Record<BlockchainStatus, number> = {
  outage: 45 * 60 * 1000, // > 45 minutes
  degraded: 30 * 60 * 1000, // 30-45 minutes
  operational: 0 // < 30 minutes
}
