---
id: account
title: Account API
sidebar_label: Account API
slug: /jellyfish/api/account
---

```js
import {JsonRpcClient} from '@defichain/jellyfish-api-jsonrpc'
const client = new JsonRpcClient('http://foo:bar@localhost:8554')

// Using client.account.
const something = await client.account.method()
```

## listAccounts

Returns information about all accounts on chain

```ts title="client.account.listAccounts()"
interface account {
  listAccounts (pagination?: AccountPagination, verbose?: boolean, options?: ListAccountOptions): Promise<Array<AccountResult<AccountOwner, string>>>
  listAccounts (pagination: AccountPagination, verbose: false, options: {indexedAmounts: false, isMineOnly: boolean}): Promise<Array<AccountResult<string, string>>>
  listAccounts (pagination: AccountPagination, verbose: true, options: {indexedAmounts: true, isMineOnly: boolean}): Promise<Array<AccountResult<AccountOwner, AccountAmount>>>
  listAccounts (pagination: AccountPagination, verbose: false, options: {indexedAmounts: true, isMineOnly: boolean}): Promise<Array<AccountResult<string, AccountAmount>>>
  listAccounts<T, U> (
    pagination: AccountPagination = { limit: 100 },
    verbose = true,
    options: ListAccountOptions = { indexedAmounts: false, isMineOnly: false }
  ): Promise<Array<AccountResult<T, U>>>
}

interface AccountPagination {
  start?: number | string
  including_start?: boolean
  limit?: number
}

interface AccountResult<T, U> {
  key: string
  owner: T // string | AccountOwner (if verbose true)
  amount: U // string | AccountAmount (if options.indexedAmounts true)
}

interface AccountOwner {
  asm: string
  hex: string
  reqSigs: BigNumber
  type: string
  addresses: string[]
}

interface AccountAmount {
  [id: string]: BigNumber
}

interface ListAccountOptions {
  indexedAmounts?: boolean
  isMineOnly?: boolean
}
```

## getAccount

Returns information about account

```ts title="client.account.getAccount()"
interface account {
  getAccount (owner: string, pagination: AccountPagination, options: { indexedAmounts: true }): Promise<AccountAmount>
  getAccount (owner: string, pagination?: AccountPagination, options?: GetAccountOptions): Promise<string[]>
  getAccount (
    owner: string,
    pagination: AccountPagination = { limit: 100 },
    options: GetAccountOptions = { indexedAmounts: false }
  ): Promise<string[] | AccountAmount>
}
```

## getTokenBalances

Returns the balances of all accounts that belong to the wallet

```ts title="client.account.getTokenBalances()"
interface account {
  getTokenBalances (pagination?: AccountPagination, indexedAmounts?: boolean, options?: GetTokenBalancesOptions): Promise<string[]>
  getTokenBalances (pagination: AccountPagination, indexedAmounts: true, options: { symbolLookup: false }): Promise<AccountAmount>
  getTokenBalances (pagination: AccountPagination, indexedAmounts: false, options: { symbolLookup: true }): Promise<string[]>
  getTokenBalances (pagination: AccountPagination, indexedAmounts: true, options: { symbolLookup: true }): Promise<AccountAmount>
  getTokenBalances (
    pagination: AccountPagination = { limit: 100 },
    indexedAmounts = false,
    options: GetTokenBalancesOptions = { symbolLookup: false, includeEth: false},
  ): Promise<string[] | AccountAmount>
}

interface AccountAmount {
  [id: string]: BigNumber
}

interface AccountPagination {
  start?: number | string
  including_start?: boolean
  limit?: number
}

interface GetTokenBalancesOptions {
  symbolLookup?: boolean
  includeEth?: boolean
}
```

## utxosToAccount

Create a UTXOs to Account transaction submitted to a connected node.
Optionally, specific UTXOs to spend to create that transaction.

```ts title="client.account.utxosToAccount()"
interface account {
  utxosToAccount (payload: BalanceTransferPayload, utxos: UTXO[] = []): Promise<string>
}

interface BalanceTransferPayload {
  [key: string]: string // `${number}@${string}`
}

interface UTXO {
  txid: string
  vout: number
}
```

## accountToAccount

Create an Account to Account transaction submitted to a connected node.
Optionally, specific UTXOs to spend to create that transaction.

```ts title="client.account.accountToAccount()"
interface account {
  accountToAccount (from: string, payload: BalanceTransferPayload, options: BalanceTransferAccountOptions = { utxos: [] }): Promise<string>
}

interface BalanceTransferPayload {
  [key: string]: string // `${number}@${string}`
}

interface BalanceTransferAccountOptions {
  utxos?: UTXO[]
}

interface UTXO {
  txid: string
  vout: number
}
```

## transferDomain

Create a transfer domain transaction submitted to a connected node.

```ts title="client.account.transferDomain()"
interface account {
  transferDomain (payload: Array<Record<string, TransferDomainInfo>>): Promise<string>
}

interface TransferDomainInfo {
  address: string
  amount: string
  domain: TransferDomainType
}

enum TransferDomainType {
  NONE = 0,
  /** type reserved for UTXO */
  UTXO = 1,
  /** type for DVM Token To EVM transfer */
  DVM = 2,
  /** type for EVM To DVM Token transfer */
  EVM = 3,
};
```

## accountToUtxos

Create an Account to UTXOS transaction submitted to a connected node.
Optionally, specific UTXOs to spend to create that transaction.

```ts title="client.account.accountToUtxos()"
interface account {
  accountToUtxos (from: string, payload: BalanceTransferPayload, options: BalanceTransferAccountOptions = { utxos: [] }): Promise<string>
}

interface BalanceTransferPayload {
  [key: string]: string // `${number}@${string}`
}

interface BalanceTransferAccountOptions {
  utxos?: UTXO[]
}

interface UTXO {
  txid: string
  vout: number
}
```

## listAccountHistory

Returns information about account history

```ts title="client.account.listAccountHistory()"
interface account {
  listAccountHistory (
    owner: OwnerType | string | string[] = OwnerType.MINE,
    options: AccountHistoryOptions = {
      limit: 100
    }
  ): Promise<AccountHistory[]>
}

enum OwnerType {
  MINE = "mine",
  ALL = "all"
}

enum DfTxType {
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
  NONE = '0'
}

enum Format {
  ID = 'id',
  SYMBOL = 'symbol'
}

interface AccountHistory {
  owner: string
  blockHeight: number
  blockHash?: string
  blockTime?: number
  type: string
  txn: number
  txid: string
  amounts: string[]
}

interface AccountHistoryOptions {
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
```

## getAccountHistory

Returns information about single account history

```ts title="client.account.getAccountHistory()"
interface account {
  getAccountHistory (
    owner: string,
    blockHeight: number,
    txn:number
  ): Promise<AccountHistory>
}

interface AccountHistory {
  owner: string
  blockHeight: number
  blockHash?: string
  blockTime?: number
  type: string
  txn: number
  txid: string
  amounts: string[]
}
```

## historyCount 

Returns count of account history

```ts title="client.account.historyCount()"
interface account {
  historyCount (
    owner: OwnerType | string | string[] = OwnerType.MINE,
    options: AccountHistoryCountOptions = {}
  ): Promise<number>
}

enum OwnerType {
  MINE = "mine",
  ALL = "all"
}

enum DfTxType {
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
  NONE = '0'
}

interface AccountHistoryCountOptions {
  token?: string
  txtype?: DfTxType
  txtypes?: DfTxType[]
  no_rewards?: boolean
}
```

## sendTokensToAddress

Creates a transfer transaction from your accounts balances.

```ts title="client.account.sendTokensToAddress()"
interface account {
  sendTokensToAddress (
    from: AddressBalances,
    to: AddressBalances,
    options: SendTokensOptions = { selectionMode: SelectionModeType.PIE }
  ): Promise<string>
}

enum SelectionModeType {
  PIE = 'pie',
  CRUMBS = 'crumbs',
  FORWARD = 'forward'
}

interface AddressBalances {
  [key: string]: string[] // `${number}@${string}`[]
}

interface SendTokensOptions {
  selectionMode: SelectionModeType
}
```

## listCommunityBalances

Returns information about current anchor bonus, incentive funding, burnt token(s)

```ts title="client.account.listCommunityBalances()"
interface account {
  listCommunityBalances (): Promise<CommunityBalanceData>
}

interface CommunityBalanceData {
  AnchorReward: BigNumber
  IncentiveFunding?: BigNumber
  Burnt: BigNumber
  Swap?: BigNumber
  Futures?: BigNumber
  Options?: BigNumber
  Unallocated?: BigNumber
  Unknown?: BigNumber
}
```

## listBurnHistory

Returns information about burn history

```ts title="client.account.listBurnHistory()"
interface account {
  listBurnHistory (
    options: BurnHistoryOptions = { limit: 100 }
  ): Promise<BurnHistory[]>
}

enum DfTxType {
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
  NONE = '0'
}

interface BurnHistoryOptions {
  maxBlockHeight?: number
  depth?: number
  token?: string
  txtype?: DfTxType
  limit?: number
}

interface BurnHistory {
  owner: string
  blockHeight: number
  blockHash: string
  blockTime: number
  type: string
  txn: number
  txid: string
  amounts: string[]
}
```

## getBurnInfo

Returns burn address, burnt coin and token information.
Requires full acindex for correct amount, tokens and feeburn values.

```ts title="client.account.getBurnInfo()"
interface account {
  getBurnInfo (): Promise<BurnInfo>
}

interface BurnInfo {
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
   * Burns after payback
   */
  paybackburn: string[]
  /**
   * Amount collected via auction burn
   */
  auctionburn: BigNumber
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
```

## futureSwap

Creates and submits to the network a futures contract.

```ts title="client.account.futureSwap()"
interface account {
  futureSwap (future: FutureSwap, utxos: UTXO[] = []): Promise<string>
}

interface FutureSwap {
  address: string
  amount: string
  destination?: string
}

interface UTXO {
  txid: string
  vout: number
}
```

## withdrawFutureSwap

Creates and submits to the network a withdrawal from futures contract transaction.

```ts title="client.account.withdrawFutureSwap()"
interface account {
  withdrawFutureSwap (future: FutureSwap, utxos: UTXO[] = []): Promise<string>
}

interface FutureSwap {
  address: string
  amount: string
  destination?: string
}

interface UTXO {
  txid: string
  vout: number
}
```

## getPendingFutureSwaps

Get specific pending futures.

```ts title="client.account.getPendingFutureSwaps()"
interface account {
  getPendingFutureSwaps (address: string): Promise<GetFutureInfo>
}

interface GetFutureInfo {
  owner: string
  values: FutureData[]
}

interface FutureData {
  source: string // eg: '1.234@DUSD'
  destination: string
}
```

## listPendingFutureSwaps

List all pending futures.

```ts title="client.account.listPendingFutureSwaps()"
interface account {
  listPendingFutureSwaps (): Promise<ListFutureInfo[]>
}

interface ListFutureInfo {
  owner: string
  source: string // eg: '1.234@DUSD'
  destination: string
}
```

## listPendingDusdSwaps

List pending DUSD swaps futures.

```ts title="client.account.listPendingDusdSwaps()"
interface account {
  listPendingDusdSwaps (): Promise<DusdSwapsInfo[]>
}

interface DusdSwapsInfo {
  owner: string
  amount: BigNumber
}
```

## getPendingDusdSwaps

Get pending DUSD swaps future.

```ts title="client.account.getPendingDusdSwaps()"
interface account {
  getPendingDusdSwaps (address: string): Promise<DusdSwapsInfo>
}

interface DusdSwapsInfo {
  owner: string
  amount: BigNumber
}
```