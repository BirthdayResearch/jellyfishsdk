import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'

/**
 * DeFi whale endpoint for poolpair related services.
 */
export class PoolPairs {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * List pool pairs
   *
   * @param {number} size of PoolPairData balance to query
   * @param {string} next set of PoolPairData
   * @return {Promise<ApiPagedResponse<PoolPairData>>}
   */
  async list (size: number = 30, next?: string): Promise<ApiPagedResponse<PoolPairData>> {
    return await this.client.requestList('GET', 'poolpairs', size, next)
  }

  /**
   * Get pool pair
   *
   * @param {string} id
   * @return {Promise<PoolPairData>}
   */
  async get (id: string): Promise<PoolPairData> {
    return await this.client.requestData('GET', `poolpairs/${id}`)
  }

  /**
   * List pool swaps
   *
   * @param {string} id poolpair id
   * @param {number} size of PoolSwap to query
   * @param {string} next set of PoolSwap
   * @return {Promise<ApiPagedResponse<PoolSwapData>>}
   */
  async listPoolSwaps (id: string, size: number = 30, next?: string): Promise<ApiPagedResponse<PoolSwapData>> {
    return await this.client.requestList('GET', `poolpairs/${id}/swaps`, size, next)
  }

  /**
   * List pool swaps with from/to
   *
   * @param {string} id poolpair id
   * @param {number} [size=10] of PoolSwap to query, max of 20 per page
   * @param {string} next set of PoolSwap
   * @return {Promise<ApiPagedResponse<PoolSwapData>>}
   */
  async listPoolSwapsVerbose (id: string, size: number = 10, next?: string): Promise<ApiPagedResponse<PoolSwapData>> {
    return await this.client.requestList('GET', `poolpairs/${id}/swaps/verbose`, size, next)
  }

  /**
   * List pool swap aggregates
   *
   * @param {string} id poolpair id
   * @param {PoolSwapAggregatedInterval} interval interval
   * @param {number} size of PoolSwap to query
   * @param {string} next set of PoolSwap
   * @return {Promise<ApiPagedResponse<PoolSwapAggregatedData>>}
   */
  async listPoolSwapAggregates (id: string, interval: PoolSwapAggregatedInterval, size: number = 30, next?: string): Promise<ApiPagedResponse<PoolSwapAggregatedData>> {
    return await this.client.requestList('GET', `poolpairs/${id}/swaps/aggregate/${interval as number}`, size, next)
  }
}

export interface PoolPairData {
  id: string
  symbol: string
  displaySymbol: string
  name: string
  status: boolean
  tokenA: {
    id: string
    symbol: string
    displaySymbol: string
    reserve: string // BigNumber
    blockCommission: string // BigNumber
  }
  tokenB: {
    id: string
    symbol: string
    displaySymbol: string
    reserve: string // BigNumber
    blockCommission: string // BigNumber
  }
  priceRatio: {
    ab: string // BigNumber
    ba: string // BigNumber
  }
  commission: string // BigNumber
  totalLiquidity: {
    token: string // BigNumber
    usd?: string // BigNumber
  }
  tradeEnabled: boolean
  ownerAddress: string
  rewardPct: string // BigNumber
  customRewards?: string[]
  creation: {
    tx: string
    height: number
  }
  apr?: {
    total: number // fractional number
    reward: number // fractional number
    commission: number // fractional number
  }
  volume?: {
    d30: number // 30d volume in usd
    h24: number // 24h volume in usd
  }
}

/**
 * @deprecated use PoolSwapData instead
 */
export type PoolSwap = PoolSwapData

/**
 * @deprecated use PoolSwapAggregatedData instead
 */
export type PoolSwapAggregated = PoolSwapAggregatedData

export interface PoolSwapData {
  id: string
  sort: string
  txid: string
  txno: number

  poolPairId: string
  fromAmount: string
  fromTokenId: number

  /**
   * To handle for optional value as Whale service might fail to resolve when indexing
   */
  from?: PoolSwapFromToData
  /**
   * To handle for optional value as Whale service might fail to resolve when indexing
   */
  to?: PoolSwapFromToData

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}

export interface PoolSwapFromToData {
  address: string
  amount: string
  symbol: string
  displaySymbol: string
}

export interface PoolSwapAggregatedData {
  id: string
  key: string
  bucket: number

  aggregated: {
    amounts: Record<string, string>
    /**
     * aggregated value in USD at current dex prices
     */
    usd: number
  }

  block: {
    medianTime: number
  }
}

export enum PoolSwapAggregatedInterval {
  ONE_HOUR = 60 * 60,
  ONE_DAY = ONE_HOUR * 24
}

export interface AllSwappableTokensResult {
  fromToken: TokenIdentifier
  swappableTokens: TokenIdentifier[]
}

export interface BestSwapPathResult {
  fromToken: TokenIdentifier
  toToken: TokenIdentifier
  bestPath: SwapPathPoolPair[]
  estimatedReturn: string
}

export interface SwapPathsResult {
  fromToken: TokenIdentifier
  toToken: TokenIdentifier
  paths: SwapPathPoolPair[][]
}

export interface SwapPathPoolPair {
  poolPairId: string
  symbol: string
  tokenA: TokenIdentifier
  tokenB: TokenIdentifier
  priceRatio: {
    ab: string
    ba: string
  }
}

export interface TokenIdentifier {
  id: string
  symbol: string
  displaySymbol: string
}
