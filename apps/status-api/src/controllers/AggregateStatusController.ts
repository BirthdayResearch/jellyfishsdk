import { Controller, Get } from '@nestjs/common'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { BlockchainStatus, BlockchainStatusController } from './BlockchainStatusController'
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
   *  To provide overall status for Ocean and blockchain services. Returns 'operational' when both services are up, 'outage' when either service is down and 'degraded' when blockchain services is degraded.
   *
   *  @return {Promise<{ status: BlockchainStatus }>}
   */

  @Get()
  async getAggregateStatus (): Promise<{ status: BlockchainStatus }> {
    let currentStatus: BlockchainStatus = 'operational'
    const liveness = await this.probe.liveness()

    if (liveness.whale.status === 'down') {
      return {
        status: 'outage'
      }
    }

    currentStatus = (await this.blockchainStatusController.getBlockChainStatus()).status

    return {
      status: currentStatus
    }
  }
}
