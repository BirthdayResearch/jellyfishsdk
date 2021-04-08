---
id: wallet
title: Wallet API
sidebar_label: Wallet API
slug: /jellyfish/api/wallet
---

```js
import {Client} from '@defichain/jellyfish'
const client = new Client()

// Using client.wallet.
const something = await client.wallet.method()
```

## getBalance

Returns the total available balance in wallet.
- `minimumConfirmation` to include transactions confirmed at least this many times.
- `includeWatchOnly` for watch-only wallets, otherwise
  - Include balance in watch-only addresses (see `importAddress`)

```ts title="client.wallet.getBalance()"
interface wallet {
  getBalance (minimumConfirmation: number = 0, 
              includeWatchOnly: boolean = false): Promise<BigNumber>   
}
```

## listUnspent

Get details of unspent transaction output (UTXO).

```ts title="client.wallet.listUnspent()"
interface wallet {
  listUnspent (payload: ListUnspentPayload): Promise<UTXO[]>
}

interface ListUnspentPayload {
  minimumConfirmation?: number
  maximumConfirmation?: number
  addresses?: string[]
  includeUnsafe?: boolean
  queryOptions?: ListUnspentQueryOptions
}

interface ListUnspentQueryOptions {
  minimumAmount?: number
  maximumAmount?: number
  maximumCount?: number
  minimumSumAmount?: number
  tokenId?: string
}

interface UTXO {
  txid: string
  vout: number
  address: string
  label: string
  scriptPubKey: string
  amount: BigNumber
  tokenId: number
  confirmations: number
  redeemScript: number
  witnessScript: number
  spendable: boolean
  solvable: boolean
  reused: string
  desc: string
  safe: boolean
}
```
