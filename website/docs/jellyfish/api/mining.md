---
id: mining
title: Mining API
sidebar_label: Mining API
slug: /jellyfish/api/mining
---

## getNetworkHashPerSecond

Returns the estimated network hashes per second.
- `nblocks` to estimate since last difficulty change.
- `height` to estimate at the time of the given height.

```ts
getNetworkHashPerSecond (nblocks: number = 120, height: number = -1): Promise<number>
```

## getMintingInfo

Get minting-related information.

```ts
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

getMintingInfo (): Promise<MintingInfo>
```
