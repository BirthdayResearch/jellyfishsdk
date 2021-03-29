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
