---
id: masternode
title: Masternode API
sidebar_label: Masternode API
slug: /jellyfish/api/masternode
---

```js
import {Client} from '@defichain/jellyfish'

const client = new Client()
// Using client.account.
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
  listMasternodes (pagination?: MasternodePagination, verbose?: boolean): Promise<MasternodeResult>
  listMasternodes (pagination: MasternodePagination, verbose: true): Promise<MasternodeResult>
  listMasternodes (pagination: MasternodePagination, verbose: false): Promise<MasternodeResult>
  listMasternodes (
    pagination: MasternodePagination = {
      including_start: true,
      limit: 100
    },
    verbose: boolean = true
  ): Promise<MasternodeResult>
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

interface MasternodeResult {
  [id: string]: MasternodeInfo
}
```

## getMasternode

Returns information about a single masternode

```ts title="client.masternode.getMasternode()"
interface masternode {
  getMasternode (masternodeId: string): Promise<MasternodeResult>
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

interface MasternodeResult {
  [id: string]: MasternodeInfo
}
```
