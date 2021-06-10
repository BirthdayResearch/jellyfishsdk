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
  createOrder (order: ICXOrder, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult>
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

interface InputUTXO {
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
  makeOffer (offer: ICXOffer, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult>
}

interface ICXOffer {
  orderTx: string
  amount: BigNumber
  ownerAddress: string
  receivePubkey?: string
  expiry?: number
}

interface InputUTXO {
  txid: string
  vout: number
}

interface ICXGenericResult {
  WARNING: string
  txid: string
}
```

## closeOffer

Closes offer transaction.

```ts title="client.icxorderbook.closeOffer()"
interface icxorderbook {
  closeOffer (offerTx: string, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult>
}

interface InputUTXO {
  txid: string
  vout: number
}

interface ICXGenericResult {
  WARNING: string
  txid: string
}
```

## submitDFCHTLC

Create and submits a DFC HTLC transaction

```ts title="client.icxorderbook.submitDFCHTLC()"
interface icxorderbook {
  submitDFCHTLC (htlc: HTLC, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult> 
}

interface HTLC {
  offerTx: string
  amount: BigNumber
  hash: string
  timeout?: number
}

interface InputUTXO {
  txid: string
  vout: number
}

interface ICXGenericResult {
  WARNING: string
  txid: string
}
```

## submitExtHTLC

Create and submits a external(EXT) HTLC transaction

```ts title="client.icxorderbook.submitExtHTLC()"
interface icxorderbook {
  submitExtHTLC (htlc: ExtHTLC, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult>
}

interface ExtHTLC {
  offerTx: string
  amount: BigNumber
  htlcScriptAddress: string
  hash: string
  ownerPubkey: string
  timeout: number
}

interface InputUTXO {
  txid: string
  vout: number
}

interface ICXGenericResult {
  WARNING: string
  txid: string
}
```

## claimDFCHTLC

Claims a DFC HTLC

```ts title="client.icxorderbook.claimDFCHTLC()"
interface icxorderbook {
  claimDFCHTLC (DFCHTLCTx: string, seed: string, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult>
}

interface InputUTXO {
  txid: string
  vout: number
}

interface ICXGenericResult {
  WARNING: string
  txid: string
}
```

## closeOrder

Closes ICX order

```ts title="client.icxorderbook.closeOrder()"
interface icxorderbook {
  closeOrder (orderTx: string, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult>
}

interface InputUTXO {
  txid: string
  vout: number
}

interface ICXGenericResult {
  WARNING: string
  txid: string
}
```

## getOrder

Returns information about order or fillorder

```ts title="client.icxorderbook.getOrder()"
interface icxorderbook {
  getOrder (orderTx: string): Promise<Record<string, ICXOrderInfo| ICXOfferInfo>>
}

interface ICXOrderInfo {
  status: ICXOrderStatus
  type: ICXOrderType
  tokenFrom: string
  chainTo?: string
  receivePubkey?: string
  chainFrom?: string
  tokenTo?: string
  ownerAddress: string
  amountFrom: BigNumber
  amountToFill: BigNumber
  orderPrice: BigNumber
  amountToFillInToAsset: BigNumber
  height: number
  expireHeight: number
  closeHeight?: number
  expired?: boolean
}

interface ICXOfferInfo {
  orderTx: string
  status: ICXOrderStatus
  amount: BigNumber
  amountInFromAsset: BigNumber
  ownerAddress: string
  receivePubkey?: string
  takerFee: BigNumber
  expireHeight: number
}
```

## listOrders

Returns information about orders or fillorders based on ICXListOrderOptions passed

```ts title="client.icxorderbook.listOrders()"
interface icxorderbook {
  listOrders (options: ICXListOrderOptions = {}): Promise<Record<string, ICXOrderInfo | ICXOfferInfo>>
}

interface ICXListOrderOptions {
  token?: string
  chain?: string
  orderTx?: string
  limit?: number
  closed?: boolean
}

interface ICXOrderInfo {
  status: ICXOrderStatus
  type: ICXOrderType
  tokenFrom: string
  chainTo?: string
  receivePubkey?: string
  chainFrom?: string
  tokenTo?: string
  ownerAddress: string
  amountFrom: BigNumber
  amountToFill: BigNumber
  orderPrice: BigNumber
  amountToFillInToAsset: BigNumber
  height: number
  expireHeight: number
  closeHeight?: number
  expired?: boolean
}

interface ICXOfferInfo {
  orderTx: string
  status: ICXOrderStatus
  amount: BigNumber
  amountInFromAsset: BigNumber
  ownerAddress: string
  receivePubkey?: string
  takerFee: BigNumber
  expireHeight: number
}
```

## listHTLCs

Returns information about HTLCs based on ICXListHTLCOptions passed

```ts title="client.icxorderbook.listHTLCs()"
interface icxorderbook {
  listHTLCs (options: ICXListHTLCOptions = {}): Promise<Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo>>
}

interface ICXListHTLCOptions {
  offerTx?: string
  limit?: number
  refunded?: boolean
  closed?: boolean
}

interface ICXClaimDFCHTLCInfo {
  type: ICXHTLCType
  dfchtlcTx: string
  seed: string
  height: number
}

interface ICXDFCHTLCInfo {
  type: ICXHTLCType
  status: ICXHTLCStatus
  offerTx: string
  amount: BigNumber
  amountInEXTAsset: BigNumber
  hash: string
  timeout: number
  height: number
  refundHeight: number
}

interface ICXEXTHTLCInfo {
  type: ICXHTLCType
  status: ICXHTLCStatus
  offerTx: string
  amount: BigNumber
  amountInDFCAsset: BigNumber
  hash: string
  htlcScriptAddress: string
  ownerPubkey: string
  timeout: number
  height: number
}
```



