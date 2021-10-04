import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'

export class Transactions {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * Get a Transaction
   *
   * @param {string} id of transaction to query
   * @return {Promise<Transaction>}
   */
  async get (id: string): Promise<Transaction> {
    return await this.client.requestData('GET', `transactions/${id}`)
  }

  /**
   * Get a list of vins of a Transaction
   *
   * @param {string} txid of the transaction
   * @param {number} [size=30] size to query
   * @param {string} [next] next token for next slice of vin
   * @return {Promise<ApiPagedResponse<TransactionVin[]>>}
   */
  async getVins (txid: string, size: number = 30, next?: string): Promise<ApiPagedResponse<TransactionVin>> {
    return await this.client.requestList('GET', `transactions/${txid}/vins`, size, next)
  }

  /**
   * Get a list of vouts of a Transaction
   *
   * @param {string} txid of the transaction
   * @param {number} [size=30] size to query
   * @param {string} [next] next token for next slice of vout
   * @return {Promise<ApiPagedResponse<TransactionVout[]>>}
   */
  async getVouts (txid: string, size: number = 30, next?: string): Promise<ApiPagedResponse<TransactionVout>> {
    return await this.client.requestList('GET', `transactions/${txid}/vouts`, size, next)
  }
}

/**
 * Transaction interface
 */
export interface Transaction {
  id: string
  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
  txid: string
  hash: string
  version: number
  size: number
  vSize: number
  weight: number
  lockTime: number
  vinCount: number
  voutCount: number
  totalVoutValue: string
}

/**
 * TransactionVin interface
 */
export interface TransactionVin {
  id: string
  txid: string
  coinbase?: string
  vout?: {
    id: string
    txid: string
    n: number
    value: string
    tokenId?: number
    script: {
      hex: string
    }
  }
  script?: {
    hex: string
  }
  txInWitness?: string[]
  sequence: string
}

/**
 * TransactionVout interface
 */
export interface TransactionVout {
  id: string
  txid: string
  n: number
  value: string
  tokenId?: number
  script: {
    hex: string
    type: string
  }
}
