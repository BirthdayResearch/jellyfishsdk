import BigNumber from 'bignumber.js'
import { ApiClient } from '..'

/**
 * PoolPair RPCs for DeFi Blockchain
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
   * @param {string} [metadata.customRewards]
   * @param {string} [metadata.pairSymbol]
   * @param {CreatePoolPairUTXO[]} utxos is an array of specific UTXOs to spend
   * @param {string} utxos.txid
   * @param {number} utxos.vout
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
   * @param {boolean} verbose default = true, otherwise only symbol, name, status, idTokenA, idTokenB
   * @return {Promise<PoolPairsResult>}
   */
  async listPoolPairs (
    pagination: PoolPairPagination = {
      start: 0,
      including_start: true,
      limit: 100
    },
    verbose = true
  ): Promise<PoolPairsResult> {
    return await this.client.call('listpoolpairs', [pagination, verbose], 'bignumber')
  }

  /**
   * Returns information about pool
   *
   * @param {string} symbol token's symbol
   * @param {boolean} verbose default = true, otherwise only symbol, name, status, idTokenA, idTokenB
   * @return {Promise<PoolPairsResult>}
   */
  async getPoolPair (symbol: string, verbose = true): Promise<PoolPairsResult> {
    return await this.client.call('getpoolpair', [symbol, verbose], 'bignumber')
  }

  /**
   * Add pool liquidity transaction
   *
   * @param {AddPoolLiquiditySource} from pool liquidity sources
   * @param {string | string[]} from[address] provides at least two types of token with format 'amoun@token'
   * @param {string} shareAddress defi address for crediting tokens
   * @param {AddPoolLiquidityOptions} [options]
   * @param {AddPoolLiquidityUTXO[]} [options.utxos] utxos array of specific UTXOs to spend
   * @param {string} [options.utxos.txid]
   * @param {number} [options.utxos.vout]
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
   * @param {PoolShareOptions} [options]
   * @param {boolean} [options.isMineOnly=true]
   * @return {Promise<PoolSharesResult>}
   */
  async listPoolShares (
    pagination: PoolPairPagination = {
      start: 0,
      including_start: true,
      limit: 100
    },
    verbose = true,
    options: PoolShareOptions = {}
  ): Promise<PoolSharesResult> {
    const { isMineOnly = true } = options
    return await this.client.call('listpoolshares', [pagination, verbose, isMineOnly], 'bignumber')
  }

  /**
   * Create a test pool swap transaction to check pool swap's return result
   *
   * @param {TestPoolSwapMetadata} metadata a provided information to create test pool swap transaction
   * @param {string} metadata.from address of the owner of tokenFrom
   * @param {string} metadata.tokenFrom swap from token {symbol/id}
   * @param {number} metadata.amountFrom amount from tokenA
   * @param {to} metadata.to address of the owner of tokenTo
   * @param {tokenTo} metadata.tokenTo swap to token {symbol/id}
   * @param {maxPrice} [metadata.maxPrice] acceptable max price
   * @return {Promise<string>} // return format 'amount@token'
   */
  async testPoolSwap (metadata: TestPoolSwapMetadata): Promise<string> {
    return await this.client.call('testpoolswap', [metadata], 'bignumber')
  }

  /**
   * Remove pool liquidity transaction
   *
   * @param {RemovePoolLiquiditySource} from pool liquidity sources
   * @param {string | string[]} from[address] provides at least two types of token with format 'amoun@token'
   * @param {string} shareAddress defi address for crediting tokens
   * @param {RemovePoolLiquidityOptions} [options]
   * @param {RemovePoolLiquidityUTXO[]} [options.utxos] utxos array of specific UTXOs to spend
   * @param {string} [options.utxos.txid]
   * @param {number} [options.utxos.vout]
   * @return {Promise<string>}
   */
  async removePoolLiquidity (from: RemovePoolLiquiditySource, shareAddress: string, options: RemovePoolLiquidityOptions = {}): Promise<string> {
    const { utxos } = options
    return await this.client.call('removepoolliquidity', [from, shareAddress, utxos], 'bignumber')
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

export interface PoolPairsResult {
  [id: string]: PoolPairInfo
}

export interface PoolPairInfo {
  symbol: string
  name: string
  status: string
  idTokenA: string
  idTokenB: string
  reserveA: BigNumber
  reserveB: BigNumber
  commission: BigNumber
  totalLiquidity: BigNumber
  'reserveA/reserveB': BigNumber | string
  'reserveB/reserveA': BigNumber | string
  tradeEnabled: boolean
  ownerAddress: string
  blockCommissionA: BigNumber
  blockCommissionB: BigNumber
  rewardPct: BigNumber
  customRewards?: BigNumber
  creationTx: string
  creationHeight: BigNumber
}

export interface PoolSharesResult {
  [id: string]: PoolShareInfo
}

export interface PoolShareInfo {
  poolID: string
  owner: string
  '%': BigNumber
  amount: BigNumber
  totalLiquidity: BigNumber
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

export interface TestPoolSwapMetadata {
  from: string
  tokenFrom: string
  amountFrom: number
  to: string
  tokenTo: string
  maxPrice?: number
}

export interface RemovePoolLiquiditySource {
  [address: string]: string | string[]
}

export interface RemovePoolLiquidityOptions {
  utxos?: RemovePoolLiquidityUTXO[]
}

export interface RemovePoolLiquidityUTXO {
  txid: string
  vout: number
}
