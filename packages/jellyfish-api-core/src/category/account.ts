import { ApiClient } from '../.'

/**
 * Account related RPC calls for DeFiChain
 */
export class Account {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Returns information about all accounts on chain
   *
   * @param {AccountPagination} [pagination]
   * @param {string} [pagination.start]
   * @param {boolean} [pagination.including_start]
   * @param {number} [pagination.limit]
   * @param {boolean} [verbose=true] default = true, otherwise limited objects are listed
   * @param {ListAccountOptions} [options] default = true, otherwise limited objects are listed
   * @param {boolean} [options.indexedAmounts=false] format of amount output, default = false (true: {tokenid:amount}, false: amount@tokenid)
   * @param {boolean} [options.isMineOnly=false] get balances about all accounts belonging to the wallet
   * @return {Promise<AccountResult[]>}
   */
  async listAccounts (
    pagination: AccountPagination = {},
    verbose = true,
    options: ListAccountOptions = {}
  ): Promise<AccountResult[]> {
    const { indexedAmounts = false, isMineOnly = false } = options
    return await this.client.call('listaccounts', [pagination, verbose, indexedAmounts, isMineOnly], 'number')
  }

  /**
   * Returns information about account
   *
   * @param {string} owner address in base58/bech32/hex encoding
   * @param {AccountPagination} [pagination]
   * @param {string} [pagination.start]
   * @param {boolean} [pagination.including_start]
   * @param {number} [pagination.limit]
   * @param {GetAccountOptions} [options]
   * @param {boolean} [options.indexedAmounts=false] format of amount output, default = false (true: {tokenid:amount}, false: amount@tokenid)
   * @return {Promise<string[]>}
   */
  async getAccount (owner: string, pagination: AccountPagination = {}, options: GetAccountOptions = {}): Promise<string> {
    const { indexedAmounts = false } = options
    return await this.client.call('getaccount', [owner, pagination, indexedAmounts], 'number')
  }

  /**
   * Returns the balances of all accounts that belong to the wallet
   * Output format: number[], eg: [60]
   *
   * @param {AccountPagination} [pagination]
   * @param {string} [pagination.start]
   * @param {boolean} [pagination.including_start]
   * @param {number} [pagination.limit]
   * @param {boolean} [indexedAmounts=false] format of amount output, default = false (true: {tokenid:amount}, false: amount@tokenid)
   * @param {GetTokenBalancesOptions} [options]
   * @param {boolean} [options.symbolLookup=false] use token symbols in output, default = false
   * @return {Promise<number[]>}
   */
  getTokenBalances<T> (
    pagination?: AccountPagination, indexedAmounts?: false, options?: GetTokenBalancesOptions
  ): Promise<T[]>

  /**
   * Returns the balances in  of all accounts that belong to the wallet
   * Output format: {tokenId: amount}, eg: {'0': 60}
   *
   * @param {AccountPagination} [pagination]
   * @param {string} [pagination.start]
   * @param {boolean} [pagination.including_start]
   * @param {number} [pagination.limit]
   * @param {boolean} [indexedAmounts=true] format of amount output, default = false (true: {tokenid:amount}, false: amount@tokenid)
   * @param {GetTokenBalancesOptions} [options]
   * @param {boolean} [options.symbolLookup=false] use token symbols in output, default = false
   * @return {Promise<TokenBalances>}
   */
  getTokenBalances<T> (
    pagination?: AccountPagination, indexedAmounts?: true, options?: GetTokenBalancesOptions,
  ): Promise<T>

  /**
   * Returns the balances of all accounts that belong to the wallet
   * Output format: ['60.00000000@DFI']
   *
   * @param {AccountPagination} [pagination]
   * @param {string} [pagination.start]
   * @param {boolean} [pagination.including_start]
   * @param {number} [pagination.limit]
   * @param {boolean} [indexedAmounts=false] format of amount output, default = false (true: {tokenid:amount}, false: amount@tokenid)
   * @param {GetTokenBalancesOptions} [options]
   * @param {boolean} [options.symbolLookup=true] use token symbols in output, default = false
   * @return {Promise<string[]>}
   */
  getTokenBalances<T> (
    pagination?: AccountPagination, indexedAmounts?: false, options?: { symbolLookup: true },
  ): Promise<T[]>

  /**
   * Returns the balances of all accounts that belong to the wallet
   *
   * @param {AccountPagination} [pagination]
   * @param {string} [pagination.start]
   * @param {boolean} [pagination.including_start]
   * @param {number} [pagination.limit]
   * @param {boolean} [indexedAmounts=false] format of amount output, default = false (true: {tokenid:amount}, false: amount@tokenid)
   * @param {GetTokenBalancesOptions} [options]
   * @param {boolean} [options.symbolLookup=false] use token symbols in output, default = false
   * @return {Promise<number[] | string[] | TokenBalances>}
   */
  async getTokenBalances<T> (
    pagination: AccountPagination = {},
    indexedAmounts = false,
    options: GetTokenBalancesOptions = {
      symbolLookup: false
    }
  ): Promise<T[] | TokenBalances> {
    const { symbolLookup } = options
    return await this.client.call('gettokenbalances', [pagination, indexedAmounts, symbolLookup], 'number')
  }

  /**
   * Returns information about account history
   *
   * @param {string} [owner='mine'] single account ID (CScript or address) or reserved words 'mine' to list history for all owned accounts or 'all' to list whole DB
   * @param {AccountHistoryOptions} [options]
   * @param {number} [options.maxBlockHeight='chaintip'] Optional height to iterate from (downto genesis block), (default = chaintip).
   * @param {number} [options.depth] Maximum depth, from the genesis block is the default
   * @param {boolean} [options.no_rewards] Filter out rewards
   * @param {string} [options.token] Filter by token
   * @param {string} [options.txtype] Filter by transaction type, supported letter from 'CRTMNnpuslrUbBG
   * @param {number} [options.limit=100] Maximum number of records to return, 100 by default
   * @return {Promise<AccountHistory[]>}
   */
  async listAccountHistory (owner = 'mine', options: AccountHistoryOptions = {}): Promise<AccountHistory[]> {
    return await this.client.call('listaccounthistory', [owner, options], 'number')
  }
}

export interface AccountPagination {
  start?: string
  including_start?: boolean
  limit?: number
}

export interface AccountResult {
  key: string
  owner: string | AccountOwner
  amount: string | AccountAmount
}

export interface AccountOwner {
  asm: string
  reqSigs: number
  type: string
  addresses: string[]
}

export interface AccountAmount {
  [id: string]: string
}

export interface ListAccountOptions {
  indexedAmounts?: boolean
  isMineOnly?: boolean
}

export interface GetAccountOptions {
  indexedAmounts?: boolean
}

export interface TokenBalances {
  [id: string]: number
}

export interface GetTokenBalancesOptions {
  symbolLookup?: boolean
}

export interface AccountHistory {
  owner: string
  blockHeight: number
  blockHash: string
  blockTime: number
  type: string
  txn: number
  txid: string
  amounts: number[]
}

export interface AccountHistoryOptions {
  maxBlockHeight?: number
  depth?: number
  no_rewards?: boolean
  token?: string
  txtype?: string
  limit?: number
}
