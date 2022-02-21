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
   * @return {Promise<ApiPagedResponse<PoolSwap>>}
   */
  async listPoolSwaps (id: string, size: number = 30, next?: string): Promise<ApiPagedResponse<PoolSwap>> {
    return await this.client.requestList('GET', `poolpairs/${id}/swaps`, size, next)
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

export interface PoolSwap {
  id: string
  sort: string
  txid: string
  txno: number

  poolPairId: string
  fromAmount: string
  fromTokenId: number

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
