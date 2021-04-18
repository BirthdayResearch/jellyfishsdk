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
   * Create a poolpair with given metadata
   *
   * @param {CreatePoolPairMetadata} metadata a data providing information for pool pair creation
   * @param {string} metadata.tokenA uses to trade to obtain tokenB
   * @param {string} metadata.tokenB
   * @param {number} metadata.commission
   * @param {boolean} metadata.status
   * @param {string} metadata.ownerAddress
   * @param {string} metadata.customRewards
   * @param {string} metadata.pairSymbol
   * @param {CreatePoolPairUTXO[]} utxos is an array of specific UTXOs to spend
   * @param {string} utxo.txid
   * @param {number} utxo.vout
   * @return Promise<string>
   */
  async createPoolPair (metadata: CreatePoolPairMetadata, utxos: CreatePoolPairUTXO[] = []): Promise<string> {
    const defaultMetadata = {
      customerRewards: [],
      pairSymbol: ''
    }
    return await this.client.call('createpoolpair', [{ ...defaultMetadata, ...metadata }, utxos], 'number')
  }

  /**
   * Returns information about pools
   *
   * @param {PoolPairPagination} pagination
   * @param {number} pagination.start
   * @param {boolean} pagination.including_start
   * @param {number} pagination.limit
   * @param {boolean} verbose
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
   * @param {string} symbol
   * @param {boolean} verbose
   * @return Promise<IPoolPair>
   */
  async getPoolPair (symbol: string, verbose = true): Promise<IPoolPair> {
    return await this.client.call('getpoolpair', [symbol, verbose], 'number')
  }

  /**
   * Returns information about pool shares
   *
   * @param {PoolPairPagination} pagination
   * @param {number} pagination.start
   * @param {boolean} pagination.including_start
   * @param {number} pagination.limit
   * @param {boolean} verbose
   * @param {boolean} isMineOnly
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

export interface CreatePoolPairMetadata {
  tokenA: string
  tokenB: string
  commission: number
  status: boolean
  ownerAddress: string
  customRewards?: string
  pairSymbol?: string
}

export interface CreatePoolPairUTXO {
  txid: string
  vout: number
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
