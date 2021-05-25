---
id: account
title: Account API
sidebar_label: Account API
slug: /jellyfish/api/account
---

```js
import {Client} from '@defichain/jellyfish'
const client = new Client()
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
  start?: number
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
    options: GetTokenBalancesOptions = { symbolLookup: false}
  ): Promise<string[] | AccountAmount>
}

interface AccountAmount {
  [id: string]: BigNumber
}

interface AccountPagination {
  start?: string | number
  including_start?: boolean
  limit?: number
}

interface GetTokenBalancesOptions {
  symbolLookup?: boolean
}
```

## listAccountHistory

Returns information about account history

```ts title="client.account.listAccountHistory()"
interface account {
  listAccountHistory (
    owner: OwnerType = 'mine',
    options: AccountHistoryOptions = {
      limit: 100
    }
  ): Promise<AccountHistory[]>
}

type OwnerType = 'mine' | 'all' | string

interface AccountHistory {
  owner: string
  blockHeight: number
  blockHash: string
  blockTime: number
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
  txtype?: string
  limit?: number
}
```

## utxosToAccount

Creates and submits to a connect node and transfer transaction from the wallet UTXOs to a specified account.
Optionally, specific UTXOs to spend to create that transaction.

```ts title="client.account.utxosToAccount()"
interface account {
  utxosToAccount (payload: BalanceTransferPayload, utxos: UTXO[] = []): Promise<string>
}

type AccountRegexType = `${string}@${string}`

interface BalanceTransferPayload {
  [key: string]: AccountRegexType
}

interface UTXO {
  txid: string
  vout: number
}
```

## accountToAccount

Creates and submits to a local node and transfer transaction from the specified account to the specfied accounts.
Optionally, specific UTXOs to spend to create that transaction.

```ts title="client.account.accountToAccount()"
interface account {
  accountToAccount (from: string, payload: BalanceTransferPayload, options: AccountToAccountOptions = { utxos: [] }): Promise<string>
}

type AccountRegexType = `${string}@${string}`

interface BalanceTransferPayload {
  [key: string]: AccountRegexType
}

interface AccountToAccountOptions {
  utxos?: UTXO[]
}

interface UTXO {
  txid: string
  vout: number
}
```
