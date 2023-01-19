import { OceanApiClient } from '../'

/**
 * @deprecated removing support very soon
 */
export class RawTx {
  constructor (private readonly api: OceanApiClient) {
  }

  /**
   * The current fee rate to submit a rawtx into the network.
   *
   * If fee rate cannot be estimated it will return a fixed rate of 0.00005000
   * This will max out at around 0.00001 DFI per average transaction (200vb).
   *
   * @param {number} confirmationTarget in blocks till fee get confirmed
   * @return {Promise<number>} fee rate per KB
   */
  async feeEstimate (confirmationTarget: number = 10): Promise<number> {
    return await this.api.requestData('GET', `rawtx/fee/estimate?confirmationTarget=${confirmationTarget}`)
  }
}
