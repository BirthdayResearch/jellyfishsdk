---
id: mining
title: Mining API
sidebar_label: Mining API
slug: /jellyfish/api/mining
---

```js
import {JsonRpcClient} from '@defichain/jellyfish-api-jsonrpc'
const client = new JsonRpcClient('http://foo:bar@localhost:8554')

// Using client.mining.
const something = await client.mining.method()
```


## getNetworkHashPerSecond

Returns the estimated network hashes per second.
- `nblocks` to estimate since last difficulty change.
- `height` to estimate at the time of the given height.

```ts title="client.mining.getNetworkHashPerSecond()"
interface mining {
  getNetworkHashPerSecond (nblocks: number = 120, 
                           height: number = -1): Promise<number>
}
```

## getMiningInfo

Get mining-related information.

```ts title="client.mining.getMiningInfo()"
interface mining {
  getMiningInfo (): Promise<MiningInfo>
}

interface MiningInfo {
  blocks: number
  currentblockweight?: number
  currentblocktx?: number
  difficulty: string
  isoperator: boolean
  masternodes: MasternodeInfo[],
  networkhashps: number
  pooledtx: number
  chain: 'main' | 'test' | 'regtest' | string
  warnings: string
}

/**
 * Masternode related information
 */
interface MasternodeInfo {
  masternodeid?: string
  masternodeoperator?: string
  masternodestate?: 'PRE_ENABLED' | 'ENABLED' | 'PRE_RESIGNED' | 'RESIGNED' | 'PRE_BANNED' | 'BANNED'
  generate?: boolean
  mintedblocks?: number
  lastblockcreationattempt?: string
}
```

## estimateSmartFee

Estimates the approximate fee per kilobyte needed for a transaction

```ts title="client.mining.estimateSmartFee()"
interface mining {
  estimateSmartFee (confirmationTarget: number, estimateMode: EstimateMode = EstimateMode.CONSERVATIVE): Promise<SmartFeeEstimation>
}

interface SmartFeeEstimation {
  feerate?: number
  errors?: string[]
  blocks: number
}

enum EstimateMode {
  UNSET = 'UNSET',
  ECONOMICAL = 'ECONOMICAL',
  CONSERVATIVE = 'CONSERVATIVE'
}
```

## getBlockTemplate

If the request parameters include a 'mode' key, that is used to explicitly select between the default 'template' request or a 'proposal'.
It returns data needed to construct a block to work on.
For full specification, see BIPs 22, 23, 9, and 145:
  https://github.com/bitcoin/bips/blob/master/bip-0022.mediawiki
  https://github.com/bitcoin/bips/blob/master/bip-0023.mediawiki
  https://github.com/bitcoin/bips/blob/master/bip-0009.mediawiki#getblocktemplate_changes
  https://github.com/bitcoin/bips/blob/master/bip-0145.mediawiki

```ts title="client.mining.getBlockTemplate()"
interface mining {
  getBlockTemplate (templateRequest: TemplateRequest): Promise<BlockTemplate>
}

interface TemplateRequest {
  mode?: string
  capabilities?: string[]
  rules: string[]
}

interface BlockTemplate {
  capabilities: string[]
  version: number
  rules: string[]
  vbavailable: any
  vbrequired: number
  previousblockhash: string
  transactions: Transaction[]
  coinbaseaux: any
  coinbasevalue: number
  longpollid: string
  target: string
  mintime: number
  mutable: string[]
  noncerange: string
  sigoplimit: number
  sizelimit: number
  weightlimit: number
  curtime: number
  bits: string
  height: number
  default_witness_commitment: string
}

```
