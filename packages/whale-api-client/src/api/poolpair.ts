import BigNumber from 'bignumber.js'
import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'

/**
 * DeFi whale endpoint for poolpair related services.
 */
export class PoolPair {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * List pool pairs
   *
   * @param {number} size of PoolPairData balance to query
   * @param {number} next set of PoolPairData
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
  name: string
  status: string
  tokenA: {
    id: string
    reserve: BigNumber
    blockCommission: BigNumber
  }
  tokenB: {
    id: string
    reserve: BigNumber
    blockCommission: BigNumber
  }
  commission: BigNumber
  totalLiquidity: BigNumber
  tradeEnabled: boolean
  ownerAddress: string
  rewardPct: BigNumber
  customRewards: BigNumber
  creation: {
    tx: string
    height: BigNumber
  }
}
