import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'

/**
 * DeFi whale endpoint for oracle related services.
 */
export class Oracles {
  constructor (private readonly client: WhaleApiClient) {
  }

  async list (size: number = 30, next?: string): Promise<ApiPagedResponse<Oracle>> {
    return await this.client.requestList('GET', 'oracles', size, next)
  }

  async getPriceFeed (oracleId: string, token: string, currency: string, size: number = 30, next?: string): Promise<ApiPagedResponse<OraclePriceFeed>> {
    const key = `${token}-${currency}`
    return await this.client.requestList('GET', `oracles/${oracleId}/${key}/feed`, size, next)
  }
}

export interface Oracle {
  id: string

  weightage: number
  priceFeeds: Array<{
    token: string
    currency: string
  }>

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}

export interface OraclePriceFeed {
  id: string
  key: string
  sort: string

  token: string
  currency: string
  oracleId: string
  txid: string

  time: number
  amount: string

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
