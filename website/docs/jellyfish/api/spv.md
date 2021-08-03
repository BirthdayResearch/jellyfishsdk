---
id: spv
title: Spv API
sidebar_label: Spv API
slug: /jellyfish/api/spv
---

```js
import {Client} from '@defichain/jellyfish'
const client = new Client()

// Using client.spv.
const something = await client.spv.method()
```

## getNewAddress

Creates and adds a Bitcoin address to the SPV wallet.

```ts title="client.spv.getNewAddress()"
interface spv {
  getNewAddress (): Promise<string>
}
```

## getAddressPubKey

Returns a Bitcoin address' public key.

```ts title="client.spv.getAddressPubKey()"
interface spv {
  getAddressPubKey (address: string): Promise<string>
}
```

## listReceivedByAddress

List balances by receiving address.

```ts title="client.spv.listReceivedByAddress()"
interface spv {
  listReceivedByAddress (minConfirmation: number = 1, address?: string): Promise<ReceivedByAddressInfo[]>
}

interface ReceivedByAddressInfo {
  address: string
  type: string
  amount: BigNumber
  confirmations: number
  txids: string[]
}
```

## sendToAddress

Send a Bitcoin amount to a given address.

```ts title="client.spv.sendToAddress()"
interface spv {
  sendToAddress (address: string, amount: BigNumber, options: SendToAddressOptions = { feeRate: new BigNumber('10000') }): Promise<SendMessageResult>
}

interface SendToAddressOptions {
  feeRate?: BigNumber
}

interface SendMessageResult {
  txid: string
  sendmessage: string
}
```

## createHtlc

Creates a Bitcoin address whose funds can be unlocked with a seed or as a refund.

```ts title="client.spv.createHtlc()"
interface spv {
  createHtlc (receiverPubKey: string, ownerPubKey: string, options: CreateHtlcOptions): Promise<CreateHtlcResult>
}

interface CreateHtlcOptions {
  timeout: string
  seedhash?: string
}

interface CreateHtlcResult {
  address: string
  redeemScript: string
  seed?: number
  seedhash?: string
}
```

## decodeHtlcScript

Decode and return value in a HTLC redeemscript.

```ts title="client.spv.decodeHtlcScript()"
interface spv {
  decodeHtlcScript (redeemScript: string): Promise<DecodeHtlcResult>
}

interface DecodeHtlcResult {
  sellerkey: string
  buyerkey: string
  blocks: number
  hash: string
}
```

## claimHtlc

Claims all coins in HTLC address.

```ts title="client.spv.claimHtlc()"
interface spv {
  claimHtlc (scriptAddress: string, destinationAddress: string, options: ClaimHtlcOptions): Promise<SendMessageResult>
}

interface ClaimHtlcOptions {
  seed: string
  feeRate?: BigNumber
}

interface SendMessageResult {
  txid: string
  sendmessage: string
}
```
