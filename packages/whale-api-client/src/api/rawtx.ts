import { WhaleApiClient } from '../whale.api.client'

/**
 * DeFi whale endpoint for rawtx related services.
 */
export class Rawtx {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * @param {RawTxReq} rawTx to submit to the network.
   * @throws WhaleApiException if failed mempool acceptance
   */
  async send (rawTx: RawTxReq): Promise<string> {
    return await this.client.requestData('POST', 'rawtx/send', rawTx)
  }

  /**
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
