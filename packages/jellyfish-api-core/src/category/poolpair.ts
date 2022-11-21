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
   * @param {UTXO[]} utxos is an array of specific UTXOs to spend
   * @param {string} utxos.txid
   * @param {number} utxos.vout
   * @return {Promise<string>}
   */
  async createPoolPair (metadata: CreatePoolPairMetadata, utxos: UTXO[] = []): Promise<string> {
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
   * @param {PoolLiquidityOptions} [options]
   * @param {AddPoolLiquidityUTXO[]} [options.utxos] utxos array of specific UTXOs to spend
   * @param {string} [options.utxos.txid]
   * @param {number} [options.utxos.vout]
   * @return {Promise<string>}
   */
  async addPoolLiquidity (from: AddPoolLiquiditySource, shareAddress: string, options: PoolLiquidityOptions = {}): Promise<string> {
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
   *  Creates a pool swap transaction with given metadata
   *
   * @param {PoolSwapMetadata} metadata a provided information to create pool swap transaction
   * @param {string} metadata.from address of the owner of tokenFrom
   * @param {string} metadata.tokenFrom swap from token {symbol/id}
   * @param {number} metadata.amountFrom amount from tokenA
   * @param {string} metadata.to address of the owner of tokenTo
   * @param {string} metadata.tokenTo swap to token {symbol/id}
   * @param {number} [metadata.maxPrice] acceptable max price
   * @param {UTXO[]} [utxos = []] array for utxos to spend from.
   * @param {string} [utxos.txid] the transaction id.
   * @param {number} [utxos.vout] the output number.
   * @return {Promise<string>}  hex of performed transaction
   */
  async poolSwap (metadata: PoolSwapMetadata, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('poolswap', [metadata, utxos], 'bignumber')
  }

  /**
   *  Creates a composite swap (swap between multiple poolpairs) transaction with given metadata.
   *
   * @param {PoolSwapMetadata} metadata a provided information to create pool swap transaction
   * @param {string} metadata.from address of the owner of tokenFrom
   * @param {string} metadata.tokenFrom swap from token {symbol/id}
   * @param {number} metadata.amountFrom amount from tokenFrom
   * @param {string} metadata.to address of the owner of tokenTo
   * @param {string} metadata.tokenTo swap to token {symbol/id}
   * @param {number} [metadata.maxPrice] acceptable max price
   * @param {UTXO[]} [utxos = []] array for utxos to spend from.
   * @param {string} utxos.txid the transaction id.
   * @param {number} utxos.vout the output number.
   * @return {Promise<string>}  hex of performed transaction
   */
  async compositeSwap (metadata: PoolSwapMetadata, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('compositeswap', [metadata, utxos], 'number')
  }

  /**
   * Create a test pool swap transaction to check pool swap's return result
   *
   * @param {PoolSwapMetadata} metadata a provided information to create test pool swap transaction
   * @param {string} metadata.from address of the owner of tokenFrom
   * @param {string} metadata.tokenFrom swap from token {symbol/id}
   * @param {number} metadata.amountFrom amount from tokenA
   * @param {string} metadata.to address of the owner of tokenTo
   * @param {string} metadata.tokenTo swap to token {symbol/id}
   * @param {number} [metadata.maxPrice] acceptable max price
   * @param {'auto' | 'direct' | 'composite' | Array<string>} [path] swap path to use, defaults to auto. Provide array of poolpair IDs to set path manually.
   * @param {boolean} [verbose] return pool path used, defaults to false
   * @return {Promise<string | TestPoolSwapVerboseResult>} formatted as 'amount@token' swapped
   */
  async testPoolSwap (metadata: PoolSwapMetadata, path: 'auto' | 'direct' | 'composite' | string[] = 'auto', verbose: boolean = false): Promise<string | TestPoolSwapVerboseResult> {
    return await this.client.call('testpoolswap', [metadata, path, verbose], 'bignumber')
  }

  /**
   * Remove pool liquidity transaction
   *
   * @param {string} address defi address for crediting tokens
   * @param {string} poolAccount pool liquidity account of owner
   * @param {PoolLiquidityOptions} [options]
   * @param {UTXO[]} [options.utxos] utxos array of specific UTXOs to spend
   * @param {string} [options.utxos.txid]
   * @param {number} [options.utxos.vout]
   * @return {Promise<string>}
   */
  async removePoolLiquidity (address: string, poolAccount: string, options: PoolLiquidityOptions = {}): Promise<string> {
    const { utxos } = options
    return await this.client.call('removepoolliquidity', [address, poolAccount, utxos], 'bignumber')
  }
}

export interface CreatePoolPairMetadata {
  tokenA: string
  tokenB: string
  commission: number
  status: boolean
  ownerAddress: string
  customRewards?: string[]
  pairSymbol?: string
}

export interface UTXO {
  txid: string
  vout: number
}

export interface PoolPairsResult {
  [id: string]: PoolPairInfo
}

export interface PoolPairInfo {
  symbol: string
  name: string
  status: boolean
  idTokenA: string
  idTokenB: string
  dexFeePctTokenA?: BigNumber
  dexFeeInPctTokenA?: BigNumber
  dexFeeOutPctTokenA?: BigNumber
  dexFeePctTokenB?: BigNumber
  dexFeeInPctTokenB?: BigNumber
  dexFeeOutPctTokenB?: BigNumber
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
  rewardLoanPct: BigNumber
  customRewards?: string[]
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

export interface PoolLiquidityOptions {
  utxos?: UTXO[]
}

export interface PoolShareOptions {
  isMineOnly?: boolean
}

export interface PoolSwapMetadata {
  from: string
  tokenFrom: string
  amountFrom: number
  to: string
  tokenTo: string
  maxPrice?: number
}

export interface TestPoolSwapVerboseResult {
  path: string
  pools: string[]
  amount: string
}
