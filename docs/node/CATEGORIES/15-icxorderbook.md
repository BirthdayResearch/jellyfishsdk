---
id: icxorderbook
title: ICXOrderBook API
sidebar_label: ICXOrderBook API
slug: /jellyfish/api/icxorderbook
---

```js
import {JsonRpcClient} from '@defichain/jellyfish-api-jsonrpc'
const client = new JsonRpcClient('http://foo:bar@localhost:8554')

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
  makeOffer (offer: ICXOffer, utxos: UTXO[] = []): Promise<ICXGenericResult>
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

## closeOffer

Closes offer transaction.

```ts title="client.icxorderbook.closeOffer()"
interface icxorderbook {
  closeOffer (offerTx: string, utxos: UTXO[] = []): Promise<ICXGenericResult>
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

## submitDFCHTLC

Create and submit a DFC HTLC transaction

```ts title="client.icxorderbook.submitDFCHTLC()"
interface icxorderbook {
  submitDFCHTLC (htlc: HTLC, utxos: UTXO[] = []): Promise<ICXGenericResult> 
}

interface HTLC {
  offerTx: string
  amount: BigNumber
  hash: string
  timeout?: number
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

## submitExtHTLC

Create and submit an external(EXT) HTLC transaction

```ts title="client.icxorderbook.submitExtHTLC()"
interface icxorderbook {
  submitExtHTLC (htlc: ExtHTLC, utxos: UTXO[] = []): Promise<ICXGenericResult>
}

interface ExtHTLC {
  offerTx: string
  amount: BigNumber
  htlcScriptAddress: string
  hash: string
  ownerPubkey: string
  timeout: number
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

## claimDFCHTLC

Claims a DFC HTLC

```ts title="client.icxorderbook.claimDFCHTLC()"
interface icxorderbook {
  claimDFCHTLC (DFCHTLCTxId: string, seed: string, utxos: UTXO[] = []): Promise<ICXGenericResult>
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

## closeOrder

Closes ICX order

```ts title="client.icxorderbook.closeOrder()"
interface icxorderbook {
  closeOrder (orderTx: string, utxos: UTXO[] = []): Promise<ICXGenericResult>
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

## getOrder

Returns information about order or fillorder

```ts title="client.icxorderbook.getOrder()"
interface icxorderbook {
  getOrder (orderTx: string): Promise<Record<string, ICXOrderInfo | ICXOfferInfo>>
}

enum ICXOrderStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  FILLED = 'FILLED',
  EXPIRED = 'EXPIRED'
}

enum ICXOrderType {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
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
  height: BigNumber
  expireHeight: BigNumber
  closeHeight?: BigNumber
  closeTx?: string
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
  expireHeight: BigNumber
}
```

## listOrders

Returns information about orders or fillorders based on ICXListOrderOptions passed

```ts title="client.icxorderbook.listOrders()"
interface icxorderbook {
  listOrders (options: { orderTx: string }  & ICXListOrderOptions): Promise<Record<string, ICXOfferInfo>>
  listOrders (options?: ICXListOrderOptions): Promise<Record<string, ICXOrderInfo | ICXOfferInfo>>
  listOrders (options: ICXListOrderOptions = {}): Promise<Record<string, ICXOrderInfo | ICXOfferInfo>>
}

enum ICXOrderStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  FILLED = 'FILLED',
  EXPIRED = 'EXPIRED'
}

enum ICXOrderType {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
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
  height: BigNumber
  expireHeight: BigNumber
  closeHeight?: BigNumber
  closeTx?: string
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
  expireHeight: BigNumber
}
```

## listHTLCs

Returns information about HTLCs based on ICXListHTLCOptions passed

```ts title="client.icxorderbook.listHTLCs()"
interface icxorderbook {
  listHTLCs (options: ICXListHTLCOptions): Promise<Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo>>
}

enum ICXHTLCType {
  CLAIM_DFC = 'CLAIM DFC',
  DFC = 'DFC',
  EXTERNAL = 'EXTERNAL'
}

enum ICXHTLCStatus {
  OPEN = 'OPEN',
  CLAIMED = 'CLAIMED',
  REFUNDED = 'REFUNDED',
  EXPIRED = 'EXPIRED',
  CLOSED = 'CLOSED'
}

interface ICXListHTLCOptions {
  offerTx: string
  limit?: number
  closed?: boolean
}

interface ICXClaimDFCHTLCInfo {
  type: ICXHTLCType
  dfchtlcTx: string
  seed: string
  height: BigNumber
}

interface ICXDFCHTLCInfo {
  type: ICXHTLCType
  status: ICXHTLCStatus
  offerTx: string
  amount: BigNumber
  amountInEXTAsset: BigNumber
  hash: string
  timeout: BigNumber
  height: BigNumber
  refundHeight: BigNumber
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
  timeout: BigNumber
  height: BigNumber
}
```



