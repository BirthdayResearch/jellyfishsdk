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

Returns a Bitcoin address's public key.

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
  sendToAddress (address: string, amount: BigNumber, options: SpvDefaultOptions = { feeRate: new BigNumber('10000') }): Promise<SendMessageResult>
}

interface SpvDefaultOptions {
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

## getHtlcSeed

Returns the HTLC secret if available.

```ts title="client.spv.getHtlcSeed()"
interface spv {
  getHtlcSeed (address: string): Promise<string>
}
```

## refundHtlc

Refunds all coins in HTLC address.

```ts title="client.spv.refundHtlc()"
interface spv {
  refundHtlc (scriptAddress: string, destinationAddress: string, options: SpvDefaultOptions = { feeRate: new BigNumber('10000') }): Promise<SendMessageResult>
}

interface SpvDefaultOptions {
  feeRate?: BigNumber
}

interface SendMessageResult {
  txid: string
  sendmessage: string
}
```

## listHtlcOutputs

List all outputs related to HTLC addresses in the wallet.

```ts title="client.spv.listHtlcOutputs()"
interface spv {
  listHtlcOutputs (scriptAddress?: string): Promise<ListHtlcsOutputsResult[]>
}

interface SpentInfo {
  txid: string
  confirms: number
}

interface ListHtlcsOutputsResult {
  txid: string
  vout: number
  amount: BigNumber
  address: string
  confirms: number
  spent: SpentInfo
}
```

## listAnchorRewardConfirms

List anchor reward confirms.

```ts title=client.spv.listAnchorRewardConfirms()"
interface spv {
  listAnchorRewardConfirms (): Promise<ListAnchorRewardConfirmsResult[]>
}

export interface ListAnchorRewardConfirmsResult {
  btcTxHeight: number
  btcTxHash: string
  anchorHeight: number
  dfiBlockHash: string
  prevAnchorHeight: number
  rewardAddress: string
  confirmSignHash: string
  signers: number
}
```

## listAnchorsUnrewarded

List anchor unrewarded.

```ts title=client.spv.listAnchorsUnrewarded()"
interface spv {
  listAnchorsUnrewarded (): Promise<ListAnchorsResult[]>
}

interface ListAnchorsResult {
  btcBlockHeight: number
  btcBlockHash: string
  btcTxHash: string
  previousAnchor: string
  defiBlockHeight: number
  defiBlockHash: string
  rewardAddress: string
  confirmations: number
  signatures: number
  active?: boolean
  anchorCreationHeight?: number
}
```

## listAnchorRewards

List anchor rewards.

```ts title=client.spv.listAnchorRewards()"
interface spv {
  listAnchorRewards (): Promise<ListAnchorRewardsResult[]>
}

interface ListAnchorRewardsResult {
  AnchorTxHash: string
  RewardTxHash: string
}
```
## createAnchor

Create, sign and send anchor tx, using only SPV API.

```ts title=client.spv.createAnchor()"
interface spv {
  createAnchor (
    createAnchorInputs: CreateAnchorInput[], rewardAddress: string, options: CreateAnchorOptions = { send: true, feerate: 1000 }
  ): Promise<CreateAnchorResult>
}

interface CreateAnchorInput {
  txid: string
  vout: number
  amount: number
  privkey: string
}

interface CreateAnchorOptions {
  send?: boolean
  feerate?: number
}

interface CreateAnchorResult {
  txHex: string
  txHash: string
  defiHash: string
  defiHeight: number
  estimatedReward: BigNumber
  cost: BigNumber
  sendResult: number
  sendMessage: string
}
```

## listAnchors

List anchors.

```ts title=client.spv.listAnchors()"
interface spv {
  listAnchors (
    options: ListAnchorsOptions = { minBtcHeight: -1, maxBtcHeight: -1, minConfs: -1, maxConfs: -1 }
  ): Promise<ListAnchorsResult[]>
}

interface ListAnchorsOptions {
  minBtcHeight?: number
  maxBtcHeight?: number
  minConfs?: number
  maxConfs?: number
}

interface ListAnchorsResult {
  btcBlockHeight: number
  btcBlockHash: string
  btcTxHash: string
  previousAnchor: string
  defiBlockHeight: number
  defiBlockHash: string
  rewardAddress: string
  confirmations: number
  signatures: number
  active?: boolean
  anchorCreationHeight?: number
}
```

## listAnchorsPending

List pending anchors in mempool.

```ts title=client.spv.listAnchorsPending()"
interface spv {
  listAnchorsPending (): Promise<ListAnchorsResult[]>
}

interface ListAnchorsResult {
  btcBlockHeight: number
  btcBlockHash: string
  btcTxHash: string
  previousAnchor: string
  defiBlockHeight: number
  defiBlockHash: string
  rewardAddress: string
  confirmations: number
  signatures: number
  active?: boolean
  anchorCreationHeight?: number
}
```

## listAnchorAuths

List anchor auths.

```ts title=client.spv.listAnchorAuths()"
interface spv {
  listAnchorAuths (): Promise<ListAnchorAuthsResult[]>
}

interface ListAnchorAuthsResult {
  previousAnchor: string
  blockHeight: number
  blockHash: string
  creationHeight: number
  signers: number
  signees?: string[]
}
```

## setLastHeight

Set last height on BTC chain, use for testing purpose.

```ts title=client.spv.setLastHeight()"
interface spv {
  setLastHeight (height: number): Promise<void>
}
```