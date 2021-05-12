import { WhaleApiClient } from '../whale.api.client'

export class Transactions {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * @param {RawTxDto} rawTx to submit to the network.
   * @throws WhaleApiException if failed mempool acceptance
   */
  async send (rawTx: RawTxDto): Promise<string> {
    return await this.client.request('POST', 'transactions', rawTx)
  }

  /**
   * @param {RawTxDto} rawTx to test mempool acceptance
   * @throws WhaleApiException if failed mempool acceptance
   */
  async test (rawTx: RawTxDto): Promise<void> {
    return await this.client.request('POST', 'transactions/test', rawTx)
  }
}

export interface RawTxDto {
  hex: string
  maxFeeRate?: number
}
