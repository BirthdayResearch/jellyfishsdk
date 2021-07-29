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
  amount: number
  confirmations: number
  txids: string[]
}
```

## sendToAddress

Send a Bitcoin amount to a given address.

```ts title="client.spv.sendToAddress()"
interface spv {
  sendToAddress (address: string, amount: BigNumber, options: SendToAddressOptions = { feerate: 10000 }): Promise<SendMessageResult>
}

interface SendToAddressOptions {
  feerate: BigNumber
}

interface SendMessageResult {
  txid: string
  sendmessage: string
}
```
