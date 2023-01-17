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
  BURN_TOKEN = 'F',
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
  AUTO_AUTH_PREP = 'A',
  NONE = '0',
  FUTURE_SWAP_EXECUTION = 'q',
  FUTURE_SWAP_REFUND = 'w'
}

/**
 * Configure the format of amounts
 * id - amount with the following 'id' -> <amount>@id
 * symbol - amount with the following 'symbol' -> <amount>@symbol
 */
export enum Format {
  ID = 'id',
  SYMBOL = 'symbol'
}

export enum SelectionModeType {
  PIE = 'pie',
  CRUMBS = 'crumbs',
  FORWARD = 'forward'
}

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
  listAccounts (pagination: AccountPagination, verbose: false, options: {indexedAmounts: false, isMineOnly: boolean}): Promise<Array<AccountResult<string, string>>>

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
  listAccounts (pagination: AccountPagination, verbose: true, options: {indexedAmounts: true, isMineOnly: boolean}): Promise<Array<AccountResult<AccountOwner, AccountAmount>>>

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
  listAccounts (pagination: AccountPagination, verbose: false, options: {indexedAmounts: true, isMineOnly: boolean}): Promise<Array<AccountResult<string, AccountAmount>>>

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
   * Create a UTXOs to Account transaction submitted to a connected node.
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
   * Create an Account to UTXOS transaction submitted to a connected node.
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
   * @param {OwnerType | string | string[]} [owner=OwnerType.MINE] Single/multiple account ID(s) (CScript or address) or reserved words 'mine' to list history for all owned accounts or 'all' to list whole DB
   * @param {AccountHistoryOptions} [options]
   * @param {number} [options.maxBlockHeight] Optional height to iterate from (down to genesis block), (default = chaintip).
   * @param {number} [options.depth] Maximum depth, from the genesis block is the default
   * @param {boolean} [options.no_rewards] Filter out rewards
   * @param {string} [options.token] Filter by token
   * @param {DfTxType} [options.txtype] Filter by transaction type. See DfTxType.
   * @param {DfTxType[]} [options.txtypes] Filter multiple transaction types, supported letter from {CustomTxType}.
   * @param {number} [options.limit=100] Maximum number of records to return, 100 by default
   * @param {number} [options.start] Number of entries to skip
   * @param {boolean} [options.including_start=false] If true, then iterate including starting position. False by default
   * @param {number} [options.txn] Order in block, unlimited by default
   * @param {Format} [options.format] Set the return amount format, Format.SYMBOL by default
   * @return {Promise<AccountHistory[]>}
   */
  async listAccountHistory (
    owner: OwnerType | string | string[] = OwnerType.MINE,
    options: AccountHistoryOptions = {
      limit: 100
    }
  ): Promise<AccountHistory[]> {
    return await this.client.call('listaccounthistory', [owner, options], 'number')
  }

  /**
   * Returns information about single account history
   *
   * @param {string} owner Single account ID (CScript or address)
   * @param {number} blockHeight Block height to search in
   * @param {number} txn Order in block
   * @return {Promise<AccountHistory>}
   */
  async getAccountHistory (
    owner: string,
    blockHeight: number,
    txn: number
  ): Promise<AccountHistory> {
    return await this.client.call('getaccounthistory', [owner, blockHeight, txn], 'number')
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
   * Creates a transfer transaction from your accounts balances.
   *
   * @param {AddressBalances} from source address as the key, the value is amount formatted as amount@token
   * @param {AddressBalances} to address as the key, the value is amount formatted as amount@token
   * @param {SendTokensOptions} [options = { selectionMode: SelectionModeType.PIE }]
   * @param {SelectionModeType} [options.selectionMode] Account selection mode. If "from" param is empty, it will auto select.
   * @return {Promise<string>}
   */
  async sendTokensToAddress (
    from: AddressBalances,
    to: AddressBalances,
    options: SendTokensOptions = { selectionMode: SelectionModeType.PIE }
  ): Promise<string> {
    return await this.client.call('sendtokenstoaddress', [from, to, options.selectionMode], 'number')
  }

  /**
   * Returns information about current anchor bonus, incentive funding, burnt token(s)
   *
   * @return {Promise<CommunityBalanceData>}
   */
  async listCommunityBalances (): Promise<CommunityBalanceData> {
    return await this.client.call('listcommunitybalances', [], 'bignumber')
  }

  /**
   * Returns information about burn history
   *
   * @param {BurnHistoryOptions} [options]
   * @param {number} [options.maxBlockHeight]  The block height to iterate from.
   * @param {number} [options.depth] Maximum depth, from the genesis block is the default
   * @param {string} [options.token] Filter by token
   * @param {DfTxType} [options.txtype] Filter by transaction type. See DfTxType.
   * @param {number} [options.limit=100] Maximum number of records to return, 100 by default
   * @return {Promise<BurnHistory[]>}
   */
  async listBurnHistory (
    options: BurnHistoryOptions = {
      limit: 100
    }
  ): Promise<BurnHistory[]> {
    return await this.client.call('listburnhistory', [options], 'number')
  }

  /**
   * Returns burn address, burnt coin and token information.
   * Requires full acindex for correct amount, tokens and feeburn values.
   *
   * @return {Promise<BurnInfo>}
   */
  async getBurnInfo (): Promise<BurnInfo> {
    return await this.client.call('getburninfo', [], 'bignumber')
  }

  /**
   * Creates and submits to the network a futures contract.
   *
   * @param {FutureSwap} future
   * @param {string} future.address Address to fund contract and receive resulting token
   * @param {string} future.amount Amount to send in amount@token format
   * @param {string} [future.destination] Expected dToken if DUSD supplied
   * @param {UTXO[]} [options.utxos = []]
   * @param {string} options.utxos.txid
   * @param {number} options.utxos.vout
   * @return {Promise<string>}
   */
  async futureSwap (future: FutureSwap, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('futureswap', [future.address, future.amount, future.destination, utxos], 'number')
  }

  /**
   * Creates and submits to the network a withdrawal from futures contract transaction.
   *
   * @param {FutureSwap} future
   * @param {string} future.address Address to fund contract and receive resulting token
   * @param {string} future.amount Amount to send in amount@token format
   * @param {string} [future.destination] Expected dToken if DUSD supplied
   * @param {UTXO[]} [options.utxos = []]
   * @param {string} options.utxos.txid
   * @param {number} options.utxos.vout
   * @return {Promise<string>}
   */
  async withdrawFutureSwap (future: FutureSwap, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('withdrawfutureswap', [future.address, future.amount, future.destination, utxos], 'number')
  }

  /**
   * Get specific pending futures.
   *
   * @return {Promise<GetFutureInfo>}
   */
  async getPendingFutureSwaps (address: string): Promise<GetFutureInfo> {
    return await this.client.call('getpendingfutureswaps', [address], 'number')
  }

  /**
   * List all pending futures.
   *
   * @return {Promise<ListFutureInfo[]>}
   */
  async listPendingFutureSwaps (): Promise<ListFutureInfo[]> {
    return await this.client.call('listpendingfutureswaps', [], 'number')
  }

  /**
   * List pending DUSD swaps futures.
   *
   * @return {Promise<DusdSwapsInfo[]>}
   */
  async listPendingDusdSwaps (): Promise<DusdSwapsInfo[]> {
    return await this.client.call('listpendingdusdswaps', [], 'bignumber')
  }

  /**
   * Get pending DUSD swaps future.
   *
   * @param {string} address to get pending future swaps
   * @return {Promise<DusdSwapsInfo>}
   */
  async getPendingDusdSwaps (address: string): Promise<DusdSwapsInfo> {
    return await this.client.call('getpendingdusdswaps', [address], 'bignumber')
  }
}

export interface AccountPagination {
  start?: number | string
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
  hex: string
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
  [key: string]: string
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
  blockHash?: string
  blockTime?: number
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
  txtypes?: DfTxType[]
  limit?: number
  start?: number
  including_start?: boolean
  txn?: number
  format?: Format
}

export interface AccountHistoryCountOptions {
  token?: string
  txtype?: DfTxType
  no_rewards?: boolean
}

export interface AddressBalances {
  [key: string]: string[]
}

export interface SendTokensOptions {
  selectionMode: SelectionModeType
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

export interface BurnHistoryOptions {
  maxBlockHeight?: number
  depth?: number
  token?: string
  txtype?: DfTxType
  limit?: number
}

export interface BurnHistory {
  owner: string
  blockHeight: number
  blockHash: string
  blockTime: number
  type: string
  txn: number
  txid: string
  amounts: string[]
}

export interface BurnInfo {
  address: string
  /**
   * Amount send to burn address
   */
  amount: BigNumber
  /**
   * Token amount send to burn address; formatted as AMOUNT@SYMBOL
   */
  tokens: string[]
  /**
   * Token amount burnt by consortium members
   */
  consortiumtokens: string[]
  /**
   * Amount collected via fee burn
   */
  feeburn: BigNumber
  /**
   * Amount collected via emission burn
   */
  emissionburn: BigNumber
  /**
   * Amount collected via auction burn
   */
  auctionburn: BigNumber
  /**
   * Burns after payback
   */
  paybackburn: string[]
  /**
   * Formatted as AMOUNT@SYMBOL
   */
  dexfeetokens: string[]
  /**
   * Amount of DFI collected from penalty resulting from paying DUSD using DFI
   */
  dfipaybackfee: BigNumber
  /**
   * Amount of tokens that are paid back; formatted as AMOUNT@SYMBOL
   */
  dfipaybacktokens: string[]
  /**
   * Amount of paybacks
   */
  paybackfees: string[]
  /**
   * Amount of tokens that are paid back
   */
  paybacktokens: string[]
  /**
   * Amount of tokens burned due to futureswap
   */
  dfip2203: string[]
  /**
   * Amount of tokens burned due to DFI-to-DUSD swap
   */
  dfip2206f: string[]
}

export interface FutureSwap {
  address: string
  amount: string
  destination?: string
}

export interface GetFutureInfo {
  owner: string
  values: FutureData[]
}

export interface FutureData {
  source: string // eg: '1.234@DUSD'
  destination: string
}

export interface ListFutureInfo {
  owner: string
  source: string // eg: '1.234@DUSD'
  destination: string
}

export interface DusdSwapsInfo {
  owner: string
  amount: BigNumber
}
