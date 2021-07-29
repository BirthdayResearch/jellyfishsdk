---
id: masternode
title: Masternode API
sidebar_label: Masternode API
slug: /jellyfish/api/masternode
---

```js
import {Client} from '@defichain/jellyfish'

const client = new Client()
// Using client.masternode.
const something = await client.masternode.method()
```

## createMasternode

Creates a masternode creation transaction with given owner and operator addresses.

```ts title="client.masternode.createMasternode()"
interface masternode {
  createMasternode (
    ownerAddress: string,
    operatorAddress?: string,
    options: CreateMasternodeOptions = { utxos: [] }
  ): Promise<string>
}

interface UTXO {
  txid: string
  vout: number
}

interface CreateMasternodeOptions {
  utxos: UTXO[]
}
```

## listMasternodes

Returns information about multiple masternodes.

```ts title="client.masternode.listMasternodes()"
interface masternode {
  listMasternodes (pagination?: MasternodePagination, verbose?: boolean): Promise<MasternodeResult<MasternodeInfo>>
  listMasternodes (pagination: MasternodePagination, verbose: true): Promise<MasternodeResult<MasternodeInfo>>
  listMasternodes (pagination: MasternodePagination, verbose: false): Promise<MasternodeResult<string>>
  listMasternodes<T> (
    pagination: MasternodePagination = {
      including_start: true,
      limit: 100
    },
    verbose: boolean = true
  ): Promise<MasternodeResult<T>>
}

enum MasternodeState {
  PRE_ENABLED = 'PRE_ENABLED',
  ENABLED = 'ENABLED',
  PRE_RESIGNED = 'PRE_RESIGNED',
  RESIGNED = 'RESIGNED',
  PRE_BANNED = 'PRE_BANNED',
  BANNED = 'BANNED',
  UNKNOWN = 'UNKNOWN'
}

interface MasternodePagination {
  start?: string
  including_start?: boolean
  limit?: number
}

interface MasternodeInfo {
  ownerAuthAddress: string
  operatorAuthAddress: string
  creationHeight: number
  resignHeight: number
  resignTx: string
  banHeight: number
  banTx: string
  state: MasternodeState
  mintedBlocks: number
  ownerIsMine: boolean
  operatorIsMine: boolean
  localMasternode: boolean
}

interface MasternodeResult<T> {
  [id: string]: T
}
```

## getMasternode

Returns information about a single masternode

```ts title="client.masternode.getMasternode()"
interface masternode {
  getMasternode (masternodeId: string): Promise<MasternodeResult<MasternodeInfo>>
}

enum MasternodeState {
  PRE_ENABLED = 'PRE_ENABLED',
  ENABLED = 'ENABLED',
  PRE_RESIGNED = 'PRE_RESIGNED',
  RESIGNED = 'RESIGNED',
  PRE_BANNED = 'PRE_BANNED',
  BANNED = 'BANNED',
  UNKNOWN = 'UNKNOWN'
}

interface MasternodeInfo {
  ownerAuthAddress: string
  operatorAuthAddress: string
  creationHeight: number
  resignHeight: number
  resignTx: string
  banHeight: number
  banTx: string
  state: MasternodeState
  mintedBlocks: number
  ownerIsMine: boolean
  operatorIsMine: boolean
  localMasternode: boolean
}

interface MasternodeResult<T> {
  [id: string]: T
}
```

## resignMasternode 

Creates a transaction resigning a masternode.

```ts title="client.masternode.resignMasternode()"
interface masternode {
  resignMasternode (masternodeId: string, utxos: UTXO[] = []): Promise<string>
}

interface UTXO {
  txid: string
  vout: number
}
```

## setGov

Set special governance variables

```ts title="client.masternode.setGov()"
interface masternode {
  setGov (input: Record<string, any>): Promise<string>
}
```

## getGov

Get information about governance variable

```ts title="client.masternode.getGov()"
interface masternode {
  getGov (name: string): Promise<Record<string, any>>
}
```

## getActiveMasternodeCount

Returns number of unique masternodes in the last specified number of blocks.

```ts title="client.masternode.getActiveMasternodeCount"
interface masternode {
  getActiveMasternodeCount (blockCount: number = 20160): Promise<number>
}
```
