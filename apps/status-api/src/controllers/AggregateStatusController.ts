import { Controller, Get } from '@nestjs/common'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { StatusToThresholdInMs } from './BlockchainStatusController'
import { WhaleApiProbeIndicator } from '../modules/WhaleApiModule'

@Controller('overall')
export class AggregateStatusController {
  constructor (
    private readonly client: WhaleApiClient,
    private readonly probe: WhaleApiProbeIndicator
  ) {
  }

  @Get('status')
  async getAggregateStatus (): Promise<{ [key: string]: AggregateStatus }> {
    let currentStatus: AggregateStatus = 'operational'
    const liveness = await this.probe.liveness()

    if (liveness.whale.status === 'down') {
      return {
        status: 'outage'
      }
    }

    const blocks = await this.client.blocks.list(1)
    const nowEpoch = Date.now()
    const latestBlockTime = blocks[0].time * 1000
    const timeDiff = nowEpoch - latestBlockTime

    if (timeDiff > StatusToThresholdInMs.outage) {
      currentStatus = 'outage'
    }

    return {
      status: currentStatus
    }
  }
}

export type AggregateStatus = 'operational' | 'outage'
