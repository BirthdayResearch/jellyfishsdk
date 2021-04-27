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

## listPoolPairs

Returns information about all accounts on chain

```ts title="client.account.listAccounts()"
interface account {
  async listAccounts<T, U> (
    pagination: AccountPagination = {},
    verbose = true,
    options: ListAccountOptions = {}
  ): Promise<Array<AccountResult<T, U>>>
}

interface AccountPagination {
  start?: string
  including_start?: boolean
  limit?: number
}

interface AccountResult<T, U> {
  key: string
  owner: T // string | AccountOwner
  amount: U // string | AccountAmount
}

interface AccountOwner {
  asm: string
  reqSigs: number
  type: string
  addresses: string[]
}

interface AccountAmount {
  [id: string]: number
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
  async getAccount (owner: string, pagination: AccountPagination = {}, options: GetAccountOptions = {}): Promise<string>
}
```

## getTokenBalances

Returns the balances of all accounts that belong to the wallet

```ts title="client.account.getTokenBalances()"
interface account {
  getTokenBalances<T> (pagination?: AccountPagination, indexedAmounts?: false, options?: GetTokenBalancesOptions): Promise<T[]>
  getTokenBalances<T> (pagination?: AccountPagination, indexedAmounts?: true, options?: GetTokenBalancesOptions): Promise<T>
  getTokenBalances<T> (pagination?: AccountPagination, indexedAmounts?: false, options?: { symbolLookup: true }): Promise<T[]>
  async getTokenBalances<T> (
    pagination: AccountPagination = {},
    indexedAmounts = false,
    options: GetTokenBalancesOptions = {
      symbolLookup: false
    }
  ): Promise<T[] | TokenBalances>
}

interface TokenBalances {
  [id: string]: number
}

interface AccountPagination {
  start?: string
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
  async listAccountHistory (owner = 'mine', options: AccountHistoryOptions = {}): Promise<AccountHistory[]>
}

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