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
   * @param {string=} metadata.customRewards
   * @param {string=} metadata.pairSymbol
   * @param {CreatePoolPairUTXO[]} utxos is an array of specific UTXOs to spend
   * @param {string} utxo.txid
   * @param {number} utxo.vout
   * @return {Promise<string>}
   */
  async createPoolPair (metadata: CreatePoolPairMetadata, utxos: CreatePoolPairUTXO[] = []): Promise<string> {
    return await this.client.call('createpoolpair', [metadata, utxos], 'number')
  }

  /**
   * Returns information about pools
   *
   * @param {PoolPairPagination} pagination
   * @param {number} pagination.start default is 0
   * @param {boolean} pagination.including_start default = true
   * @param {number} pagination.limit to limit number of records
   * @param {boolean} verbose default = true, otherwise only symbol, name, status, idTokena, idTokenB
   * @return {Promise<PoolPairResult>}
   */
  async listPoolPairs (
    pagination: PoolPairPagination = {
      start: 0,
      including_start: true,
      limit: 100
    },
    verbose = true
  ): Promise<PoolPairResult> {
    return await this.client.call('listpoolpairs', [pagination, verbose], 'bignumber')
  }

  /**
   * Returns information about pool
   *
   * @param {string} symbol token's symbol
   * @param {boolean} verbose default = true, otherwise only symbol, name, status, idTokena, idTokenB
   * @return {Promise<PoolPairResult>}
   */
  async getPoolPair (symbol: string, verbose = true): Promise<PoolPairResult> {
    return await this.client.call('getpoolpair', [symbol, verbose], 'bignumber')
  }

  /**
   * Add pool liquidity transaction
   *
   * @param {AddPoolLiquiditySource} from pool liquidity sources
   * @param {string | string[]} from[address] provides at least two types of token with format 'amoun@token'
   * @param {string} shareAddress defi address for crediting tokens
   * @param {AddPoolLiquidityOptions} options
   * @param {AddPoolLiquidityUTXO[]=} options.utxos utxos array of specific UTXOs to spend
   * @param {string} options.utxos.txid
   * @param {number} options.utxos.vout
   * @return {Promise<string>}
   */
  async addPoolLiquidity (from: AddPoolLiquiditySource, shareAddress: string, options: AddPoolLiquidityOptions = {}): Promise<string> {
    const { utxos } = options
    return await this.client.call('addpoolliquidity', [from, shareAddress, utxos], 'bignumber')
  }

  /**
   * Returns information about pool shares
   *
   * @param {PoolPairPagination} pagination
   * @param {number} pagination.start default is 0
   * @param {boolean} pagination.including_start default = true
   * @param {number} pagination.limit to limit number of records
   * @param {boolean} verbose default = true, otherwise only poolID, owner and %
   * @param {PoolShareOptions} options
   * @param {boolean=} options.isMineOnly default = true
   * @return {Promise<PoolShareResult>}
   */
  async listPoolShares (
    pagination: PoolPairPagination = {
      start: 0,
      including_start: true,
      limit: 100
    },
    verbose = true,
    options: PoolShareOptions = {}
  ): Promise<PoolShareResult> {
    const { isMineOnly = true } = options
    return await this.client.call('listpoolshares', [pagination, verbose, isMineOnly], 'bignumber')
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

export interface PoolPairResult {
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
    ['reserveA/reserveB']: string
    ['reserveB/reserveA']: string
    tradeEnabled: boolean
    ownerAddress: string
    blockCommissionA: BigNumber
    blockCommissionB: BigNumber
    rewardPct: BigNumber
    customRewards: BigNumber
    creationTx: string
    creationHeight: BigNumber
  }
}

export interface PoolShareResult {
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

export interface AddPoolLiquiditySource {
  [address: string]: string | string[]
}

export interface AddPoolLiquidityOptions {
  utxos?: AddPoolLiquidityUTXO[]
}

export interface AddPoolLiquidityUTXO {
  txid: string
  vout: number
}

export interface PoolShareOptions {
  isMineOnly?: boolean
}
