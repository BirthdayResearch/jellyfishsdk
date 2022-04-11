import { Controller, Get } from '@nestjs/common'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { BlockchainStatusController } from './BlockchainStatusController'
import { WhaleApiProbeIndicator } from '../modules/WhaleApiModule'

@Controller('overall')
export class AggregateStatusController {
  constructor (
    private readonly client: WhaleApiClient,
    private readonly probe: WhaleApiProbeIndicator,
    private readonly blockchainStatusController: BlockchainStatusController
  ) {
  }

  /**
   *  To provide overall status for Ocean and whale services.
   *
   *  @return {Promise<{ status: AggregateStatus }>}
   */

  @Get()
  async getAggregateStatus (): Promise<{ status: AggregateStatus }> {
    const liveness = await this.probe.liveness()

    if (liveness.whale.status === 'down') {
      return {
        status: 'outage'
      }
    }

    let currentStatus: AggregateStatus = 'operational'

    const blockchainStatus = await this.blockchainStatusController.getBlockChainStatus()

    if (blockchainStatus.status === 'outage') {
      currentStatus = 'outage'
    }
    return {
      status: currentStatus
    }
  }
}

export type AggregateStatus = 'operational' | 'outage'
