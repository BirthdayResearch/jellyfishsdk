---
id: blockchain
title: Blockchain API
sidebar_label: Blockchain API
slug: /jellyfish/api/blockchain
---

```js
import {Client} from '@defichain/jellyfish'
const client = new Client()

// Using client.blockchain.
const something = await client.blockchain.method()
```

## getBlockchainInfo

Get various state info regarding blockchain processing.

```ts title="client.blockchain.getBlockchainInfo()"
interface blockchain {
  getBlockchainInfo (): Promise<BlockchainInfo>
}

interface BlockchainInfo {
  chain: 'main' | 'test' | 'regtest' | string
  blocks: number
  headers: number
  bestblockhash: string
  difficulty: number
  mediantime: number
  verificationprogress: number
  initialblockdownload: boolean
  chainwork: string
  size_on_disk: number
  pruned: boolean
  softforks: {
    [id: string]: {
      type: 'buried' | 'bip9'
      active: boolean
      height: number
    }
  }
  warnings: string
}
```

## getBlock

Get block data with particular header hash.

```ts title="client.blockchain.getBlock()"
interface blockchain {
  getBlock(): Promise<BlockVerbo>;
}

interface BlockBase {
  hash: string
  confirmations: number
  strippedsize: number
  size: number
  weight: number
  height: number
  masternode: string
  minter: string
  mintedBlocks: any
  stakeModifier: any
  version: number
  versionHex: string
  merkleroot: string
  time: number
  mediantime: number
  bits: string
  difficulty: number
  chainwork: string
  nTx: number
  previousblockhash: string
  nextblockhash: string
}

interface BlockVerbo1 extends BlockBase {
  tx: string[]
}

interface BlockVerbo2 extends BlockBase {
  tx: RawTx[]
}

interface RawTx {
  txid: string
  hash: string
  version: number
  size: number
  vsize: number
  weight: number
  locktime: number
  vin: Vin[]
  vout: Vout[]
  hex: string
}

interface Vin {
  coinbase: string
  txid: string
  vout: number
  scriptSig: 
    asm: string
    hex: string
  }
  txinwitness: string[]
  sequence: string
}

interface Vout {
  value: number
  n: number
  scriptPubKey: 
    asm: string
    hex: string
    type: string
    reqSigs: number
    addresses: string[]
    tokenId: string
  }
}
```

## getBlockHash

Get a hash of block in best-block-chain at height provided.

```ts title="client.blockchain.getBlockHash()"
interface blockchain {
  getBlockHash(height: number): Promise<string>
}
```

## getBlockCount

Get the height of the most-work fully-validated chain.

```ts title="client.blockchain.getBlockCount()"
interface blockchain {
  getBlockCount (): Promise<number>
}
```

