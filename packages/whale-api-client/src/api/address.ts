import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'

/**
 * DeFi whale endpoint for address related services.
 */
export class Address {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * Get current balance of an address
   *
   * @param {string} address bech32/legacy/b58 formatted address
   * @return {Promise<string>} balance in string
   */
  async getBalance (address: string): Promise<string> {
    return await this.client.requestData('GET', `address/${address}/balance`)
  }

  /**
   * Get current aggregated stats of an address
   *
   * @param {string} address bech32/legacy/b58 formatted address
   * @return {Promise<AddressAggregation>}
   */
  async getAggregation (address: string): Promise<AddressAggregation> {
    // TODO(fuxingloh): typing
    return await this.client.requestData('GET', `address/${address}/aggregation`)
  }

  /**
   * List all tokens balance belonging to an address.
   *
   * @param {string} address bech32/legacy/b58 formatted address
   * @param {number} size to query
   * @param {number} next token for next slice of AddressToken
   * @return {Promise<ApiPagedResponse<AddressToken>>}
   */
  async listToken (address: string, size: number = 30, next?: string): Promise<ApiPagedResponse<AddressToken>> {
    return await this.client.requestList('GET', `address/${address}/tokens`, size, next)
  }

  /**
   * List all transaction activity belonging to an address.
   *
   * @param {string} address bech32/legacy/b58 formatted address
   * @param {number} size to query
   * @param {number} next token for next slice of AddressActivity
   * @return {Promise<ApiPagedResponse<AddressActivity>>}
   */
  async listTransaction (address: string, size: number = 30, next?: string): Promise<ApiPagedResponse<AddressActivity>> {
    return await this.client.requestList('GET', `address/${address}/transactions`, size, next)
  }

  /**
   * List all unspent belonging to an address.
   *
   * @param {string} address bech32/legacy/b58 formatted address
   * @param {number} size to query
   * @param {number} next token for next slice of AddressUnspent
   * @return {Promise<ApiPagedResponse<AddressUnspent>>}
   */
  async listTransactionUnspent (address: string, size: number = 30, next?: string): Promise<ApiPagedResponse<AddressUnspent>> {
    return await this.client.requestList('GET', `address/${address}/transactions/unspent`, size, next)
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

export interface AddressAggregation {
  id: string
  hid: string

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }

  script: {
    type: string
    hex: string
  }

  statistic: {
    txCount: number
    txInCount: number
    txOutCount: number
  }

  amount: {
    txIn: string
    txOut: string
    unspent: string
  }
}

export interface AddressActivity {
  id: string
  hid: string

  type: 'vin' | 'vout'
  typeHex: '00' | '01'
  txid: string

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }

  script: {
    type: string
    hex: string
  }

  vin?: {
    txid: string
    n: number
  }

  vout?: {
    txid: string
    n: number
  }

  value: string
  tokenId?: number
}

export interface AddressUnspent {
  id: string
  hid: string
  sort: string

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }

  script: {
    type: string
    hex: string
  }

  vout: {
    txid: string
    n: number
    value: string
    tokenId?: number
  }
}
