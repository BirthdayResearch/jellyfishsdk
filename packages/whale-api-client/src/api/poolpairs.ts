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
  }
}
