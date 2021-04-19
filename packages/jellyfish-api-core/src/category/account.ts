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
   * @param {AccountPagination=} pagination
   * @param {string} pagination.start
   * @param {boolean} pagination.including_start
   * @param {number} pagination.limit
   * @param {boolean} verbose default = true, otherwise limited objects are listed
   * @param {boolean} indexedAmounts format of amount output, default = false (true: {tokenid:amount}, false: amount@tokenid)
   * @param {boolean} isMineOnly get balances about all accounts belonging to the wallet
   * @return Promise<IAccount>
   */
  async listAccounts (
    pagination: AccountPagination = {
      // start: '',
      including_start: false,
      limit: 100
    }, verbose = true, indexedAmounts = false, isMineOnly = false
  ): Promise<any> {
    return await this.client.call('listaccounts', [pagination, verbose, indexedAmounts, isMineOnly], 'number')
  }

  /**
   * Returns information about account
   *
   * @param {string} owner address in base58/bech32/hex encoding
   * @param {AccountPagination} pagination
   * @param {string} pagination.start
   * @param {boolean} pagination.including_start
   * @param {number} pagination.limit
   * @param {boolean} indexedAmounts format of amount output, default = false (true: {tokenid:amount}, false: amount@tokenid)
   * @return Promise<IAccount>
   */
  async getAccount (owner: string, pagination: AccountPagination = {
    start: '',
    including_start: true,
    limit: 100
  }, indexedAmounts = false): Promise<any> {
    return await this.client.call('getaccount', [owner, pagination, indexedAmounts], 'number')
  }

  /**
   * Returns the balances of all accounts that belong to the wallet
   *
   * @param {AccountPagination} pagination
   * @param {string} pagination.start
   * @param {boolean} pagination.including_start
   * @param {number} pagination.limit
   * @param {boolean} indexedAmounts format of amount output, default = false (true: {tokenid:amount}, false: amount@tokenid)
   * @param {boolean} symbolLookup use token symbols in output, default = false
   * @return
   */
  async getTokenBalances (
    pagination: AccountPagination = {
      start: '',
      including_start: true,
      limit: 100
    }, indexedAmounts = false, symbolLookup = false
  ): Promise<any> {
    return await this.client.call('gettokenbalances', [pagination, indexedAmounts, symbolLookup], 'number')
  }

  /**
   * Returns information about account history
   *
   * @param {string=} owner
   * @param {AccountHistoryOptions=} options
   * @param {number=} options.maxBlockHeight Optional height to iterate from (downto genesis block), (default = chaintip).
   * @param {number=} options.depth Maximum depth, from the genesis block is the default
   * @param {boolean=} options.no_rewards Filter out rewards
   * @param {string=} options.token Filter by token
   * @param {string=} options.txtype Filter by transaction type, supported letter from 'CRTMNnpuslrUbBG
   * @param {number=} options.limit Maximum number of records to return, 100 by default
   * @return
   */
  async listAccountHistory (owner?: string, options?: AccountHistoryOptions): Promise<any> {
    return await this.client.call('listaccounthistory', [owner, options], 'number')
  }
}

export interface AccountPagination {
  start?: string
  including_start?: boolean
  limit?: number
}

// export interface IAccount {
// }

export interface AccountHistoryOptions {
  maxBlockHeight: number
  depth: number
  no_rewards: boolean
  token: string
  txtype: string
  limit: number
}
