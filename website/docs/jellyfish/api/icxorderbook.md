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

## ICXCreateOrder

Create and submits an ICX order creation transaction.

```ts title="client.icxorderbook.ICXCreateOrder()"
interface icxorderbook {
  ICXCreateOrder (order: Order, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult>
}

interface Order {
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

## ICXMakeOffer

Create and submits a makeoffer transaction.

```ts title="client.icxorderbook.ICXMakeOffer()"
interface icxorderbook {
  ICXMakeOffer (offer: Offer, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult>
}

interface Offer {
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

## ICXCloseOffer

Closes offer transaction.

```ts title="client.icxorderbook.ICXCloseOffer()"
interface icxorderbook {
  ICXCloseOffer (offerTx: string, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult>
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

## ICXSubmitDFCHTLC

Create and submits a DFC HTLC transaction

```ts title="client.icxorderbook.ICXSubmitDFCHTLC()"
interface icxorderbook {
  ICXSubmitDFCHTLC (htlc: HTLC, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult> 
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

## ICXSubmitExtHTLC

Create and submits a external(EXT) HTLC transaction

```ts title="client.icxorderbook.ICXSubmitExtHTLC()"
interface icxorderbook {
  ICXSubmitExtHTLC (htlc: ExtHTLC, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult>
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

## ICXClaimDFCHTLC

Claims a DFC HTLC

```ts title="client.icxorderbook.ICXClaimDFCHTLC()"
interface icxorderbook {
  ICXClaimDFCHTLC (DFCHTLCTx: string, seed: string, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult>
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

## ICXCloseOrder

Closes ICX order

```ts title="client.icxorderbook.ICXCloseOrder()"
interface icxorderbook {
  ICXCloseOrder (orderTx: string, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult>
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

## ICXGetOrder

Returns information about order or fillorder

```ts title="client.icxorderbook.ICXGetOrder()"
interface icxorderbook {
  ICXGetOrder (orderTx: string): Promise<Record<string, ICXOrderInfo| ICXMakeOfferInfo>>
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

interface ICXMakeOfferInfo {
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

## ICXListOrders

Returns information about orders or fillorders based on ICXListOrderOptions passed

```ts title="client.icxorderbook.ICXListOrders()"
interface icxorderbook {
  ICXListOrders (options: ICXListOrderOptions = {}): Promise<Record<string, ICXOrderInfo | ICXMakeOfferInfo>>
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

interface ICXMakeOfferInfo {
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

## ICXListHTLCs

Returns information about HTLCs based on ICXListHTLCOptions passed

```ts title="client.icxorderbook.ICXListHTLCs()"
interface icxorderbook {
  ICXListHTLCs (options: ICXListHTLCOptions = {}): Promise<Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo>>
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



