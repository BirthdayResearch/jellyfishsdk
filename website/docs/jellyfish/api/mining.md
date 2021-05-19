---
id: mining
title: Mining API
sidebar_label: Mining API
slug: /jellyfish/api/mining
---

```js
import {Client} from '@defichain/jellyfish'
const client = new Client()

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

## getMintingInfo

Get minting-related information. Deprecated in favour of `mining.getMiningInfo()`.

```ts title="client.mining.getMintingInfo()"
interface mining {
  /**
   * @deprecated prefer getMiningInfo for multiple masternode support.
   */
  getMintingInfo (): Promise<MintingInfo>
}

interface MintingInfo {
  blocks: number
  currentblockweight?: number
  currentblocktx?: number
  difficulty: string
  isoperator: boolean
  masternodeid?: string
  masternodeoperator?: string
  masternodestate?: 'PRE_ENABLED' | 'ENABLED' | 'PRE_RESIGNED' | 'RESIGNED' | 'PRE_BANNED' | 'BANNED'
  generate?: boolean
  mintedblocks?: number
  networkhashps: number
  pooledtx: number
  chain: 'main' | 'test' | 'regtest' | string
  warnings: string
}
```

## getMiningInfo

Get minting-related information.

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
  estimateSmartFee (confirmationTarget: number, estimateMode: EstimateMode = 'CONSERVATIVE'): Promise<SmartFeeEstimation>
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
