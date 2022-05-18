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
  masternodestate?: MasternodeState
  generate?: boolean
  mintedblocks?: number
  lastblockcreationattempt?: string
}

enum MasternodeState {
  PRE_ENABLED = 'PRE_ENABLED',
  ENABLED = 'ENABLED',
  PRE_RESIGNED = 'PRE_RESIGNED',
  RESIGNED = 'RESIGNED',
  PRE_BANNED = 'PRE_BANNED',
  BANNED = 'BANNED',
  UNKNOWN = 'UNKNOWN',
  TRANSFERRING = 'TRANSFERRING'
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
