import { WhaleApiClient } from '../whale.api.client'

/**
 * DeFi whale endpoint for rawtx related services.
 */
export class Rawtx {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * Send a raw transaction
   *
   * @param {RawTxReq} rawTx to submit to the network.
   * @throws WhaleApiException if failed mempool acceptance
   * @returns {Promise<string>} txid
   */
  async send (rawTx: RawTxReq): Promise<string> {
    return await this.client.requestData('POST', 'rawtx/send', rawTx)
  }

  /**
   * Send a raw transaction to test the mempool acceptance
   *
   * @param {RawTxReq} rawTx to test mempool acceptance
   * @throws WhaleApiException if failed mempool acceptance
   */
  async test (rawTx: RawTxReq): Promise<void> {
    return await this.client.requestData('POST', 'rawtx/test', rawTx)
  }
}

/**
 * Raw transaction request
 */
export interface RawTxReq {
  hex: string
  maxFeeRate?: number
}
