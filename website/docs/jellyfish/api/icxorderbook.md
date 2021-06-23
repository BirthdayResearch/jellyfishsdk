---
id: icxorderbook
title: ICXOrderBook API
sidebar_label: ICXOrderBook API
slug: /jellyfish/api/icxorderbook
---

```js
import {Client} from '@defichain/jellyfish'
const client = new Client()

// Using client.icxorderbook.
const something = await client.icxorderbook.method()
```

## createOrder

Create and submits an ICX order creation transaction.

```ts title="client.icxorderbook.createOrder()"
interface icxorderbook {
  createOrder (order: ICXOrder, utxos: UTXO[] = []): Promise<ICXGenericResult>
}

interface ICXOrder {
  tokenFrom?: string
  chainFrom?: string
  chainTo?: string
  tokenTo?: string
  ownerAddress?: string
  receivePubkey?: string
  amountFrom: BigNumber
  orderPrice: BigNumber
  expiry?: number
}

interface UTXO {
  txid: string
  vout: number
}

interface ICXGenericResult {
  WARNING: string
  txid: string
}
```

## makeOffer

Create and submits a makeoffer transaction.

```ts title="client.icxorderbook.makeOffer()"
interface icxorderbook {
  makeOffer (offer: ICXOffer, inputUTXOs: UTXO[] = []): Promise<ICXGenericResult>
}

interface ICXOffer {
  orderTx: string
  amount: BigNumber
  ownerAddress: string
  receivePubkey?: string
  expiry?: number
}

interface UTXO {
  txid: string
  vout: number
}

interface ICXGenericResult {
  WARNING: string
  txid: string
}
```
