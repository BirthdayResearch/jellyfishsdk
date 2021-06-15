import BigNumber from 'bignumber.js'
import { ApiClient } from '../.'

/**
 * Single account ID (CScript or address) or reserved words,
 * - 'mine' to list history for all owned accounts or
 * - 'all' to list the whole DB
 */
export enum OwnerType {
  MINE = 'mine',
  ALL = 'all'
}

export enum DfTxType {
  MINT_TOKEN = 'M',
  POOL_SWAP = 's',
  ADD_POOL_LIQUIDITY = 'l',
  REMOVE_POOL_LIQUIDITY = 'r',
  UTXOS_TO_ACCOUNT = 'U',
  ACCOUNT_TO_UTXOS = 'b',
  ACCOUNT_TO_ACCOUNT = 'B',
  ANY_ACCOUNTS_TO_ACCOUNTS = 'a',
  CREATE_MASTERNODE = 'C',
  RESIGN_MASTERNODE = 'R',
  CREATE_TOKEN = 'T',
  UPDATE_TOKEN = 'N',
  UPDATE_TOKEN_ANY = 'n',
  CREATE_POOL_PAIR = 'p',
  UPDATE_POOL_PAIR = 'u',
  SET_GOV_VARIABLE = 'G',
  AUTO_AUTH_PREP = 'A'
}

type AccountRegexType = `${number}@${string}`

/**
 * Account RPCs for DeFi Blockchain
 */
export class Account {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Get information about all accounts on chain
   * Return account with object owner info, addresses and amount with tokenId
   *
   * @param {AccountPagination} [pagination]
   * @param {string} [pagination.start]
   * @param {boolean} [pagination.including_start]
   * @param {number} [pagination.limit=100]
   * @param {boolean} [verbose=true] default = true, otherwise limited objects are listed
   * @param {ListAccountOptions} [options] default = true, otherwise limited objects are listed
   * @param {boolean} [options.indexedAmounts=false] format of amount output, default = false (true: {tokenid:amount}, false: amount@tokenid)
   * @param {boolean} [options.isMineOnly=false] get balances about all accounts belonging to the wallet
   * @return {Promise<Array<AccountResult<AccountOwner, string>>>}
   */
  listAccounts (pagination?: AccountPagination, verbose?: boolean, options?: ListAccountOptions): Promise<Array<AccountResult<AccountOwner, string>>>

  /**
   * Get information about all accounts on chain
   * Return account with hex-encoded owner info, addresses and amount with tokenId
   *
   * @param {AccountPagination} [pagination]
   * @param {string} [pagination.start]
   * @param {boolean} [pagination.including_start]
   * @param {number} [pagination.limit=100]
   * @param {boolean} [verbose=true] default = true, otherwise limited objects are listed
   * @param {ListAccountOptions} [options] default = true, otherwise limited objects are listed
   * @param {boolean} [options.indexedAmounts=false] format of amount output, default = false (true: {tokenid:amount}, false: amount@tokenid)
   * @param {boolean} [options.isMineOnly=false] get balances about all accounts belonging to the wallet
   * @return {Promise<Array<AccountResult<string, string>>>}
   */
  listAccounts (pagination: AccountPagination, verbose: false, options: { indexedAmounts: false, isMineOnly: boolean }): Promise<Array<AccountResult<string, string>>>

  /**
   * Get information about all accounts on chain
   * Return account with object owner info, addresses and object with indexed amount
   *
   * @param {AccountPagination} [pagination]
   * @param {string} [pagination.start]
   * @param {boolean} [pagination.including_start]
   * @param {number} [pagination.limit=100]
   * @param {boolean} [verbose=true] default = true, otherwise limited objects are listed
   * @param {ListAccountOptions} [options] default = true, otherwise limited objects are listed
   * @param {boolean} [options.indexedAmounts=false] format of amount output, default = false (true: {tokenid:amount}, false: amount@tokenid)
   * @param {boolean} [options.isMineOnly=false] get balances about all accounts belonging to the wallet
   * @return {Promise<Array<AccountResult<AccountOwner, AccountAmount>>>}
   */
  listAccounts (pagination: AccountPagination, verbose: true, options: { indexedAmounts: true, isMineOnly: boolean }): Promise<Array<AccountResult<AccountOwner, AccountAmount>>>

  /**
   * Get information about all accounts on chain
   * Return account with hex-encoded owner info, addresses and object with indexed amount
   *
   * @param {AccountPagination} [pagination]
   * @param {string} [pagination.start]
   * @param {boolean} [pagination.including_start]
   * @param {number} [pagination.limit=100]
   * @param {boolean} [verbose=true] default = true, otherwise limited objects are listed
   * @param {ListAccountOptions} [options] default = true, otherwise limited objects are listed
   * @param {boolean} [options.indexedAmounts=false] format of amount output, default = false (true: {tokenid:amount}, false: amount@tokenid)
   * @param {boolean} [options.isMineOnly=false] get balances about all accounts belonging to the wallet
   * @return {Promise<Array<AccountResult<string, AccountAmount>>>}
   */
  listAccounts (pagination: AccountPagination, verbose: false, options: { indexedAmounts: true, isMineOnly: boolean }): Promise<Array<AccountResult<string, AccountAmount>>>

  async listAccounts<T, U> (
    pagination: AccountPagination = { limit: 100 },
    verbose = true,
    options: ListAccountOptions = { indexedAmounts: false, isMineOnly: false }
  ): Promise<Array<AccountResult<T, U>>> {
    const { indexedAmounts, isMineOnly } = options
    return await this.client.call('listaccounts', [pagination, verbose, indexedAmounts, isMineOnly], 'bignumber')
  }

  /**
   * Get information about account
   * Return an object account with indexed amount
   *
   * @param {string} owner address in base58/bech32/hex encoding
   * @param {AccountPagination} [pagination]
   * @param {string | number} [pagination.start]
   * @param {boolean} [pagination.including_start]
   * @param {number} [pagination.limit=100]
   * @param {GetAccountOptions} [options]
   * @param {boolean} [options.indexedAmounts=false] format of amount output, default = false (true: {tokenid:amount}, false: amount@tokenid)
   * @return {Promise<AccountAmount} resolves {'0': 60}
   */
  getAccount (owner: string, pagination: AccountPagination, options: { indexedAmounts: true }): Promise<AccountAmount>

  /**
   * Get information about account
   * Return an array of amount with tokenId
   *
   * @param {string} owner address in base58/bech32/hex encoding
   * @param {AccountPagination} [pagination]
   * @param {string | number} [pagination.start]
   * @param {boolean} [pagination.including_start]
   * @param {number} [pagination.limit=100]
   * @param {GetAccountOptions} [options]
   * @param {boolean} [options.indexedAmounts=false] format of amount output, default = false (true: {tokenid:amount}, false: amount@tokenid)
   * @return {Promise<string[]> | AccountAmount} resolves as ['60.00000000@DFI']
   */
  getAccount (owner: string, pagination?: AccountPagination, options?: GetAccountOptions): Promise<string[]>

  async getAccount (
    owner: string,
    pagination: AccountPagination = { limit: 100 },
    options: GetAccountOptions = { indexedAmounts: false }
  ): Promise<string[] | AccountAmount> {
    const { indexedAmounts = false } = options
    return await this.client.call('getaccount', [owner, pagination, indexedAmounts], 'number')
  }

  /**
   * Get the balances of all accounts that belong to the wallet
   * Return an array of amount with index
   *
   * @param {AccountPagination} [pagination]
   * @param {string} [pagination.start]
   * @param {boolean} [pagination.including_start]
   * @param {number} [pagination.limit=100]
   * @param {boolean} [indexedAmounts=false] format of amount output, default = false (true: {tokenid:amount}, false: amount@tokenid)
   * @param {GetTokenBalancesOptions} [options]
   * @param {boolean} [options.symbolLookup=false] use token symbols in output, default = false
   * @return {Promise<string[]>} resolves as [ '300.00000000@0', '200.00000000@1' ]
   */
  getTokenBalances (pagination?: AccountPagination, indexedAmounts?: boolean, options?: GetTokenBalancesOptions): Promise<string[]>

  /**
   * Get the balances of all accounts that belong to the wallet
   * Return object amount with index
   *
   * @param {AccountPagination} [pagination]
   * @param {string} [pagination.start]
   * @param {boolean} [pagination.including_start]
   * @param {number} [pagination.limit=100]
   * @param {boolean} [indexedAmounts=false] format of amount output, default = false (true: {tokenid:amount}, false: amount@tokenid)
   * @param {GetTokenBalancesOptions} [options]
   * @param {boolean} [options.symbolLookup=false] use token symbols in output, default = false
   * @return {Promise<AccountAmount>} resolves as { '0': 300, '1': 200 }
   */
  getTokenBalances (pagination: AccountPagination, indexedAmounts: true, options: { symbolLookup: false }): Promise<AccountAmount>

  /**
   * Get the balances of all accounts that belong to the wallet
   * Return array of amount with tokenId
   *
   * @param {AccountPagination} [pagination]
   * @param {string} [pagination.start]
   * @param {boolean} [pagination.including_start]
   * @param {number} [pagination.limit=100]
   * @param {boolean} [indexedAmounts=false] format of amount output, default = false (true: {tokenid:amount}, false: amount@tokenid)
   * @param {GetTokenBalancesOptions} [options]
   * @param {boolean} [options.symbolLookup=false] use token symbols in output, default = false
   * @return {Promise<string[]>} resolves as [ '300.00000000@DFI', '200.00000000@DBTC' ]
   */
  getTokenBalances (pagination: AccountPagination, indexedAmounts: false, options: { symbolLookup: true }): Promise<string[]>

  /**
   * Get the balances of all accounts that belong to the wallet
   * Return object amount with tokenId
   *
   * @param {AccountPagination} [pagination]
   * @param {string} [pagination.start]
   * @param {boolean} [pagination.including_start]
   * @param {number} [pagination.limit=100]
   * @param {boolean} [indexedAmounts=false] format of amount output, default = false (true: {tokenid:amount}, false: amount@tokenid)
   * @param {GetTokenBalancesOptions} [options]
   * @param {boolean} [options.symbolLookup=false] use token symbols in output, default = false
   * @return {Promise<AccountAmount>} resolves as { DFI: 300, DBTC: 200 }
   */
  getTokenBalances (pagination: AccountPagination, indexedAmounts: true, options: { symbolLookup: true }): Promise<AccountAmount>

  async getTokenBalances (
    pagination: AccountPagination = { limit: 100 },
    indexedAmounts = false,
    options: GetTokenBalancesOptions = { symbolLookup: false }
  ): Promise<string[] | AccountAmount> {
    const { symbolLookup } = options
    return await this.client.call('gettokenbalances', [pagination, indexedAmounts, symbolLookup], 'bignumber')
  }

  /**
   * Create an UTXOs to Account transaction submitted to a connected node.
   * Optionally, specific UTXOs to spend to create that transaction.
   *
   * @param {BalanceTransferPayload} payload
   * @param {string} payload[address]
   * @param {UTXO[]} [utxos = []]
   * @param {string} [utxos.txid]
   * @param {number} [utxos.vout]
   * @return {Promise<string>}
   */
  async utxosToAccount (payload: BalanceTransferPayload, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('utxostoaccount', [payload, utxos], 'number')
  }

  /**
   * Create an Account to Account transaction submitted to a connected node.
   * Optionally, specific UTXOs to spend to create that transaction.
   *
   * @param {string} from
   * @param {BalanceTransferPayload} payload
   * @param {string} payload[address]
   * @param {BalanceTransferAccountOptions} [options]
   * @param {UTXO[]} [options.utxos = []]
   * @param {string} [options.utxos.txid]
   * @param {number} [options.utxos.vout]
   * @return {Promise<string>}
   */
  async accountToAccount (from: string, payload: BalanceTransferPayload, options: BalanceTransferAccountOptions = { utxos: [] }): Promise<string> {
    return await this.client.call('accounttoaccount', [from, payload, options.utxos], 'number')
  }

  /**
   * Create an Account to UXTOS transaction submitted to a connected node.
   * Optionally, specific UTXOs to spend to create that transaction.
   *
   * @param {string} from
   * @param {BalanceTransferPayload} payload
   * @param {string} payload[address]
   * @param {BalanceTransferAccountOptions} [options]
   * @param {UTXO[]} [options.utxos = []]
   * @param {string} [options.utxos.txid]
   * @param {number} [options.utxos.vout]
   * @return {Promise<string>}
   */
  async accountToUtxos (from: string, payload: BalanceTransferPayload, options: BalanceTransferAccountOptions = { utxos: [] }): Promise<string> {
    return await this.client.call('accounttoutxos', [from, payload, options.utxos], 'number')
  }

  /**
   * Returns information about account history
   *
   * @param {OwnerType | string} [owner=OwnerType.MINE] single account ID (CScript or address) or reserved words 'mine' to list history for all owned accounts or 'all' to list whole DB
   * @param {AccountHistoryOptions} [options]
   * @param {number} [options.maxBlockHeight] Optional height to iterate from (down to genesis block), (default = chaintip).
   * @param {number} [options.depth] Maximum depth, from the genesis block is the default
   * @param {boolean} [options.no_rewards] Filter out rewards
   * @param {string} [options.token] Filter by token
   * @param {DfTxType} [options.txtype] Filter by transaction type. See DfTxType.
   * @param {number} [options.limit=100] Maximum number of records to return, 100 by default
   * @return {Promise<AccountHistory[]>}
   */
  async listAccountHistory (
    owner: OwnerType | string = OwnerType.MINE,
    options: AccountHistoryOptions = {
      limit: 100
    }
  ): Promise<AccountHistory[]> {
    return await this.client.call('listaccounthistory', [owner, options], 'number')
  }

  /**
   * Returns count of account history
   *
   * @param {OwnerType | string} [owner=OwnerType.MINE] single account ID (CScript or address) or reserved words 'mine' to list history count for all owned accounts or 'all' to list whole DB
   * @param {AccountHistoryCountOptions} [options]
   * @param {boolean} [options.no_rewards] Filter out rewards
   * @param {string} [options.token] Filter by token
   * @param {DfTxType} [options.txtype] Filter by transaction type. See DfTxType.
   * @return {Promise<number>} count of account history
   */
  async historyCount (
    owner: OwnerType | string = OwnerType.MINE,
    options: AccountHistoryCountOptions = {}
  ): Promise<number> {
    return await this.client.call('accounthistorycount', [owner, options], 'number')
  }

  /**
   * Returns information about current anchor bonus, incentive funding, burnt token(s)
   *
   * @return {Promise<CommunityBalanceData>}
   */
  async listCommunityBalances (): Promise<CommunityBalanceData> {
    return await this.client.call('listcommunitybalances', [], 'bignumber')
  }
}

export interface AccountPagination {
  start?: number
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
  reqSigs: BigNumber
  type: string
  addresses: string[]
}

export interface AccountAmount {
  [id: string]: BigNumber
}

export interface ListAccountOptions {
  indexedAmounts?: boolean
  isMineOnly?: boolean
}

export interface GetAccountOptions {
  indexedAmounts?: boolean
}

export interface GetTokenBalancesOptions {
  symbolLookup?: boolean
}

export interface BalanceTransferPayload {
  [key: string]: AccountRegexType
}

export interface BalanceTransferAccountOptions {
  utxos?: UTXO[]
}

export interface UTXO {
  txid: string
  vout: number
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
  txtype?: DfTxType
  limit?: number
}

export interface AccountHistoryCountOptions {
  token?: string
  txtype?: DfTxType
  no_rewards?: boolean
}

export interface CommunityBalanceData {
  AnchorReward: BigNumber
  IncentiveFunding?: BigNumber
  Burnt: BigNumber
  Swap?: BigNumber
  Futures?: BigNumber
  Options?: BigNumber
  Unallocated?: BigNumber
  Unknown?: BigNumber
}
