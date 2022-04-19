import { Controller, Get } from '@nestjs/common'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { BlockchainStatus, BlockchainStatusController } from './BlockchainStatusController'
import { WhaleApiProbeIndicator } from '../modules/WhaleApiModule'

@Controller('overall')
export class OverallStatusController {
  constructor (
    private readonly client: WhaleApiClient,
    private readonly probe: WhaleApiProbeIndicator,
    private readonly blockchainStatusController: BlockchainStatusController
  ) {
  }

  /**
   *  To provide overall status for Ocean and blockchain services. Returns
   *  'operational' when both services are up,
   *  'outage' when either service is down and
   *  'degraded' when blockchain service is degraded.
   *
   *  @return {Promise<{ status: BlockchainStatus }>}
   */

  @Get()
  async getOverallStatus (): Promise<{ status: BlockchainStatus }> {
    if (
      (await this.probe.liveness()).whale.status === 'down' ||
      (await this.probe.readiness()).whale.status === 'down'
    ) {
      return {
        status: 'outage'
      }
    }

    const blockchain = await this.blockchainStatusController.getBlockChainStatus()
    return {
      status: blockchain.status
    }
  }
}
