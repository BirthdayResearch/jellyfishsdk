import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'
import { OraclePriceFeed } from './oracles'

/**
 * Time interval for graphing
 */
export enum PriceFeedTimeInterval {
  FIVE_MINUTES = 5 * 60,
  TEN_MINUTES = 10 * 60,
  ONE_HOUR = 60 * 60,
  ONE_DAY = 24 * 60 * 60
}

/**
 * DeFi whale endpoint for price related services.
 */
export class Prices {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * Get a list of PriceTicker
   *
   * @param {number} [size=30] for the number of records per page
   * @param {string} [next] offset for the next page
   * @return {Promise<PriceTicker>}
   */
  async list (size: number = 30, next?: string): Promise<ApiPagedResponse<PriceTicker>> {
    return await this.client.requestList('GET', 'prices', size, next)
  }

  /**
   * Get a PriceTicker
   *
   * @param {string} token symbol for the PriceTicker
   * @param {string} currency fiat currency for the PriceTicker
   * @return {Promise<PriceTicker>}
   */
  async get (token: string, currency: string): Promise<PriceTicker> {
    const key = `${token}-${currency}`
    return await this.client.requestData('GET', `prices/${key}`)
  }

  /**
   * Get a list of rice feed
   *
   * @param {string} token symbol for the PriceTicker
   * @param {string} currency fiat for the PriceTicker
   * @param {number} [size=30] for number of records per page
   * @param {string} [next] offset for the next page
   * @return {Promise<ApiPagedResponse<PriceFeed>>}
   */
  async getFeed (token: string, currency: string, size: number = 30, next?: string): Promise<ApiPagedResponse<PriceFeed>> {
    const key = `${token}-${currency}`
    return await this.client.requestList('GET', `prices/${key}/feed`, size, next)
  }

  async getFeedWithInterval (token: string, currency: string, interval: PriceFeedTimeInterval, size: number = 30, next?: string): Promise<ApiPagedResponse<PriceFeedInterval>> {
    const key = `${token}-${currency}`
    return await this.client.requestList('GET', `prices/${key}/feed/interval/${interval}`, size, next)
  }

  /**
   * Get a list of Oracles
   *
   * @param {string} token symbol for the PriceOracle
   * @param {string} currency fiat currency for the PriceOracle
   * @param {number} [size=30] for number of records per page
   * @param {string} [next] offset for the next page
   * @return {Promise<ApiPagedResponse<PriceOracle>>}
   */
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

export interface PriceFeedInterval {
  id: string
  key: string
  sort: string

  token: string
  currency: string

  aggregated: {
    amount: string
    weightage: number
    count: number
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
