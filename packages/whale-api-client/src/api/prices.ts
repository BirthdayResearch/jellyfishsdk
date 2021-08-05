import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'
import { OraclePriceFeed } from './oracles'

/**
 * DeFi whale endpoint for price related services.
 */
export class Prices {
  constructor (private readonly client: WhaleApiClient) {
  }

  async list (size: number = 30, next?: string): Promise<ApiPagedResponse<PriceTicker>> {
    return await this.client.requestList('GET', 'prices', size, next)
  }

  async get (token: string, currency: string): Promise<PriceTicker> {
    const key = `${token}-${currency}`
    return await this.client.requestData('GET', `prices/${key}`)
  }

  async getFeed (token: string, currency: string, size: number = 30, next?: string): Promise<ApiPagedResponse<PriceFeed>> {
    const key = `${token}-${currency}`
    return await this.client.requestList('GET', `prices/${key}/feed`, size, next)
  }

  async getOracles (token: string, currency: string, size: number = 30, next?: string): Promise<ApiPagedResponse<PriceOracle>> {
    const key = `${token}-${currency}`
    return await this.client.requestList('GET', `prices/${key}/oracles`, size, next)
  }
}

export interface PriceTicker {
  id: string
  sort: string
  price: PriceFeed
}

export interface PriceFeed {
  id: string
  key: string
  sort: string

  token: string
  currency: string

  aggregated: {
    amount: string
    weightage: number
    oracles: {
      active: number
      total: number
    }
  }

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}

export interface PriceOracle {
  id: string
  key: string

  token: string
  currency: string
  oracleId: string
  weightage: number

  /**
   * Optional as OraclePriceFeed might not be available e.g. newly initialized Oracle
   */
  feed?: OraclePriceFeed

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
