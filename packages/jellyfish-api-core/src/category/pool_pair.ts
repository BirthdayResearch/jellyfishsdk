import BigNumber from 'bignumber.js'
import { ApiClient } from '..'

/**
 * PoolPair related RPC calls for DeFiChain
 */
export class PoolPair {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Returns information about pools
   *
   * @param pagination
   * @param verbose
   * @return Promise<any>
   */
  async listPoolPairs (
    pagination: PoolPairPagination = {
      start: 0,
      including_start: true,
      limit: 100
    },
    verbose = true
  ): Promise<IPoolPair> {
    return await this.client.call('listpoolpairs', [pagination, verbose], {
      reserveA: 'bignumber',
      reserveB: 'bignumber',
      commission: 'bignumber',
      totalLiquidity: 'bignumber',
      'reserveA/reserveB': 'bignumber',
      'reserveB/reserveA': 'bignumber',
      blockCommissionA: 'bignumber',
      blockCommissionB: 'bignumber',
      rewardPct: 'bignumber',
      customRewards: 'bignumber'
    })
  }

  /**
   * Returns information about pool
   *
   * @param symbol
   * @param verbose
   * @return Promise<IPoolPair>
   */
  async getPoolPair (symbol: string, verbose = true): Promise<IPoolPair> {
    return await this.client.call('getpoolpair', [symbol, verbose], 'number')
  }

  /**
   * Returns information about pool shares
   *
   * @param pagination
   * @param verbose
   * @param isMineOnly
   * @return Promise<IPoolShare>
   */
  async listPoolShares (
    pagination: PoolPairPagination = {
      start: 0,
      including_start: true,
      limit: 100
    },
    verbose = true,
    isMineOnly = false
  ): Promise<IPoolShare> {
    return await this.client.call('listpoolshares', [pagination, verbose, isMineOnly], {
      '%': 'bignumber',
      amount: 'bignumber',
      totalLiquidity: 'bignumber'
    })
  }
}

export interface IPoolPair {
  [id: string]: {
    symbol: string
    name: string
    status: string
    idTokenA: string
    idTokenB: string
    reserveA: BigNumber
    reserveB: BigNumber
    commission: BigNumber
    totalLiquidity: BigNumber
    ['reserveA/reserveB']: BigNumber
    ['reserveB/reserveA']: BigNumber
    tradeEnabled: boolean
    ownerAddress: string
    blockCommissionA: BigNumber
    blockCommissionB: BigNumber
    rewardPct: BigNumber
    customRewards: BigNumber
    creationTx: string
    creationHeight: number
  }
}

export interface IPoolShare {
  [id: string]: {
    poolID: string
    owner: string
    ['%']: BigNumber
    amount: BigNumber
    totalLiquidity: BigNumber
  }
}

export interface PoolPairPagination {
  start: number
  including_start: boolean
  limit: number
}
