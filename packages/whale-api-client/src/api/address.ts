import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'
import { LoanVaultActive, LoanVaultLiquidated } from './loan'

/**
 * DeFi whale endpoint for address related services.
 */
export class Address {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * List account history
   *
   * @param {string} address to list account history
   * @param {string} size of account history
   * @param {string} next set of account history
   * @return {Promise<ApiPagedResponse<AddressHistory>>}
   */
  async listAccountHistory (address: string, size: number = 30, next?: string): Promise<ApiPagedResponse<AddressHistory>> {
    return await this.client.requestList('GET', `address/${address}/history`, size, next)
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
   * List all vaults belonging to an address.
   *
   * @param {string} address bech32/legacy/b58 formatted address
   * @param {number} size of vaults to query
   * @param {string} next set of vaults
   * @return {Promise<ApiPagedResponse<LoanVaultActive | LoanVaultLiquidated>>}
   */
  async listVault (address: string, size: number = 30, next?: string): Promise<ApiPagedResponse<LoanVaultActive | LoanVaultLiquidated>> {
    return await this.client.requestList('GET', `address/${address}/vaults`, size, next)
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
  displaySymbol: string
  symbolKey: string
  name: string
  isDAT: boolean
  isLPS: boolean
  isLoanToken: boolean
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

  statistic: { // TODO(fuxingloh): should be named `count: {}`, too late to change now.
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

export interface AddressHistory {
  owner: string
  txid: string
  txn: number
  type: string
  amounts: string[]
  block: {
    height: number
    hash: string
    time: number
  }
}
