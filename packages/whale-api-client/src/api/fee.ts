import { WhaleApiClient } from '../whale.api.client'

/**
 * DeFi whale endpoint for fee related services.
 */
export class Fee {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * @param {number} confirmationTarget in blocks till fee get confirmed
   * @return {Promise<number>} fee rate per KB
   */
  async estimate (confirmationTarget: number = 10): Promise<number> {
    return await this.client.requestData('GET', `fee/estimate?confirmationTarget=${confirmationTarget}`)
  }
}
