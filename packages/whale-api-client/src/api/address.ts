import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'

/**
 * DeFi whale endpoint for address related services.
 */
export class Address {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * List all tokens balance belonging to an address.
   *
   * @param {string} address bech32/legacy/b58 formatted address
   * @param {number} size of AddressToken balance to query
   * @param {number} next set of AddressToken
   * @return {Promise<ApiPagedResponse<AddressToken>>}
   */
  async listTokens (address: string, size: number = 30, next?: string): Promise<ApiPagedResponse<AddressToken>> {
    return await this.client.requestList('GET', `address/${address}/tokens`, size, next)
  }
}

/**
 * Tokens owned by an address.
 */
export interface AddressToken {
  id: string
  amount: string
  symbol: string
  symbolKey: string
  name: string
  isDAT: boolean
  isLPS: boolean
}
