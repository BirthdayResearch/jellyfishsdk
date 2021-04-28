import { ApiClient } from '../.'

type OwnerType = 'mine' | 'all' | string

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
   * @param {number} [pagination.limit=100]
   * @param {boolean} [verbose=true] default = true, otherwise limited objects are listed
   * @param {ListAccountOptions} [options] default = true, otherwise limited objects are listed
   * @param {boolean} [options.indexedAmounts=false] format of amount output, default = false (true: {tokenid:amount}, false: amount@tokenid)
   * @param {boolean} [options.isMineOnly=false] get balances about all accounts belonging to the wallet
   * @return {Promise<Array<AccountResult<T, U>>>}
   */
  listAccounts (pagination: AccountPagination, verbose: true, options: {indexedAmounts: false, isMineOnly: boolean}): Promise<Array<AccountResult<AccountOwner, string>>>

  listAccounts (pagination: AccountPagination, verbose: false, options: {indexedAmounts: false, isMineOnly: boolean}): Promise<Array<AccountResult<string, string>>>

  listAccounts (pagination: AccountPagination, verbose: true, options: {indexedAmounts: true, isMineOnly: boolean}): Promise<Array<AccountResult<AccountOwner, AccountAmount>>>

  listAccounts (pagination: AccountPagination, verbose: false, options: {indexedAmounts: true, isMineOnly: boolean}): Promise<Array<AccountResult<string, AccountAmount>>>

  async listAccounts<T, U> (
    pagination: AccountPagination = { limit: 100 },
    verbose = true,
    options: ListAccountOptions = { indexedAmounts: false, isMineOnly: false }
  ): Promise<Array<AccountResult<T, U>>> {
    const { indexedAmounts = false, isMineOnly = false } = options
    return await this.client.call('listaccounts', [pagination, verbose, indexedAmounts, isMineOnly], 'number')
  }

  /**
   * Returns information about account
   *
   * @param {string} owner address in base58/bech32/hex encoding
   * @param {AccountPagination} [pagination]
   * @param {string | number} [pagination.start]
   * @param {boolean} [pagination.including_start]
   * @param {number} [pagination.limit=100]
   * @param {GetAccountOptions} [options]
   * @param {boolean} [options.indexedAmounts=false] format of amount output, default = false (true: {tokenid:amount}, false: amount@tokenid)
   * @return {Promise<string[]> | AccountAmount}
   */

  // ['60.00000000@DFI']
  getAccount (owner: string, pagination: AccountPagination, options: { indexedAmounts: false }): Promise<string[]>

  // {'0': 60}
  getAccount (owner: string, pagination: AccountPagination, options: { indexedAmounts: true }): Promise<AccountAmount>

  async getAccount (
    owner: string,
    pagination: AccountPagination = { limit: 100 },
    options: GetAccountOptions = { indexedAmounts: false }
  ): Promise<string[] | AccountAmount> {
    const { indexedAmounts = false } = options
    return await this.client.call('getaccount', [owner, pagination, indexedAmounts], 'number')
  }

  /**
   * Returns the balances of all accounts that belong to the wallet
   *
   * @param {AccountPagination} [pagination]
   * @param {string} [pagination.start]
   * @param {boolean} [pagination.including_start]
   * @param {number} [pagination.limit=100]
   * @param {boolean} [indexedAmounts=false] format of amount output, default = false (true: {tokenid:amount}, false: amount@tokenid)
   * @param {GetTokenBalancesOptions} [options]
   * @param {boolean} [options.symbolLookup=false] use token symbols in output, default = false
   * @return {Promise<number[] | string[] | TokenBalances>}
   */

  // [ '300.00000000@0', '200.00000000@1' ]
  getTokenBalances (pagination: AccountPagination, indexedAmounts: false, options: { symbolLookup: false }): Promise<string[]>

  // { '0': 300, '1': 200 }
  getTokenBalances (pagination: AccountPagination, indexedAmounts: true, options: { symbolLookup: false }): Promise<TokenBalances>

  // [ '300.00000000@DFI', '200.00000000@DBTC' ]
  getTokenBalances (pagination: AccountPagination, indexedAmounts: false, options: { symbolLookup: true }): Promise<string[]>

  // { DFI: 300, DBTC: 200 }
  getTokenBalances (pagination: AccountPagination, indexedAmounts: true, options: { symbolLookup: true }): Promise<TokenBalances>

  async getTokenBalances (
    pagination: AccountPagination = { limit: 100 },
    indexedAmounts = false,
    options: GetTokenBalancesOptions = { symbolLookup: false }
  ): Promise<string[] | TokenBalances> {
    const { symbolLookup } = options
    return await this.client.call('gettokenbalances', [pagination, indexedAmounts, symbolLookup], 'number')
  }

  /**
   * Returns information about account history
   *
   * @param {OwnerType} [owner='mine'] single account ID (CScript or address) or reserved words 'mine' to list history for all owned accounts or 'all' to list whole DB
   * @param {AccountHistoryOptions} [options]
   * @param {number} [options.maxBlockHeight] Optional height to iterate from (downto genesis block), (default = chaintip).
   * @param {number} [options.depth] Maximum depth, from the genesis block is the default
   * @param {boolean} [options.no_rewards] Filter out rewards
   * @param {string} [options.token] Filter by token
   * @param {string} [options.txtype] Filter by transaction type, supported letter from 'CRTMNnpuslrUbBG
   * @param {number} [options.limit=100] Maximum number of records to return, 100 by default
   * @return {Promise<AccountHistory[]>}
   */
  async listAccountHistory (
    owner: OwnerType = 'mine',
    options: AccountHistoryOptions = {
      limit: 100
    }
  ): Promise<AccountHistory[]> {
    return await this.client.call('listaccounthistory', [owner, options], 'number')
  }
}

export interface AccountPagination {
  start?: string | number
  including_start?: boolean
  limit?: number
}

export interface AccountResult<T, U> {
  key: string
  owner: T // string | AccountOwner
  amount: U // string | AccountAmount
}

export interface AccountOwner {
  asm: string
  reqSigs: number
  type: string
  addresses: string[]
}

export interface AccountAmount {
  [id: string]: number
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
  amounts: string[]
}

export interface AccountHistoryOptions {
  maxBlockHeight?: number
  depth?: number
  no_rewards?: boolean
  token?: string
  txtype?: string
  limit?: number
}
