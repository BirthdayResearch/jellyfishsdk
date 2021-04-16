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
   * @param pagination
   * @param pagination.start
   * @param pagination.including_start
   * @param pagination.limit
   * @param verbose default = true, otherwise limited objects are listed
   * @param indexedAmounts format of amount output, default = false (true: {tokenid:amount}, false: amount@tokenid)
   * @param isMineOnly get balances about all accounts belonging to the wallet
   * @return Promise<IAccount>
   */
  async listAccounts (
    pagination: AccountPagination = {
      start: '',
      including_start: true,
      limit: 100
    }, verbose = true, indexedAmounts = false, isMineOnly = false
  ): Promise<any> {
    return await this.client.call('listaccounts', [{}, verbose, indexedAmounts, isMineOnly], 'number')
  }

  /**
   * Returns information about account
   *
   * @param owner adress in base58/bech32/hex encoding
   * @param pagination
   * @param pagination.start
   * @param pagination.including_start
   * @param pagination.limit
   * @param indexedAmounts format of amount output, default = false (true: {tokenid:amount}, false: amount@tokenid)
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
   * @param pagination
   * @param pagination.start
   * @param pagination.including_start
   * @param pagination.limit
   * @param indexedAmounts format of amount output, default = false (true: {tokenid:amount}, false: amount@tokenid)
   * @param symbolLookup use token symbols in output, default = false
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
   * @param owner
   * @param options
   * @param options.maxBlockHeight
   * @param options.depth
   * @param options.no_rewards
   * @param options.token
   * @param options.txtype
   * @param options.limit
   * @return
   */
  async listAccountHistory (): Promise<any> {
    return await this.client.call('listaccounthistory', [], 'number')
  }
}

export interface AccountPagination {
  start: string
  including_start: boolean
  limit: number
}

// export interface IAccount {

// }
