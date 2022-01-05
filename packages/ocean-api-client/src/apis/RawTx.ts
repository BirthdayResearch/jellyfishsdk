import { OceanApiClient } from '../'

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

  /**
   * Send a raw transaction
   *
   * @param {RawTxReq} rawTx to submit to the network.
   * @throws WhaleApiException if failed mempool acceptance
   * @returns {Promise<string>} txid
   */
  async send (rawTx: RawTxReq): Promise<string> {
    return await this.api.requestData('POST', 'rawtx/send', rawTx)
  }

  /**
     * Send a raw transaction to test the mempool acceptance
     *
     * @param {RawTxReq} rawTx to test mempool acceptance
     * @throws WhaleApiException if failed mempool acceptance
     */
  async test (rawTx: RawTxReq): Promise<void> {
    return await this.api.requestData('POST', 'rawtx/test', rawTx)
  }
}

/**
 * Raw transaction request
 */
export interface RawTxReq {
  hex: string
  maxFeeRate?: number
}
