import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common'
import { ApiClient, mining } from '@defichain/jellyfish-api-core'

@Controller('/fee')
export class FeeController {
  constructor (private readonly client: ApiClient) {
  }

  /**
   * If fee rate cannot be estimated it will return a fixed rate of 0.00005000
   * This will max out at around 0.00001 DFI per average transaction (200vb).
   *
   * @param {number} confirmationTarget in blocks till fee get confirmed
   * @return {Promise<number>} fee rate per KB
   */
  @Get('/estimate')
  async estimate (@Query('confirmationTarget', ParseIntPipe) confirmationTarget: number = 10): Promise<number> {
    const estimation = await this.client.mining.estimateSmartFee(confirmationTarget, mining.EstimateMode.CONSERVATIVE)
    if (estimation.feerate !== undefined) {
      return estimation.feerate
    }

    return 0.00005000
  }
}
