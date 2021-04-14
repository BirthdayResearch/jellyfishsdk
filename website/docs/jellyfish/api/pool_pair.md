---
id: poolPair
title: Pool Pair API
sidebar_label: Pool Pair API
slug: /jellyfish/api/pool-pair
---

```js
import {Client} from '@defichain/jellyfish'
const client = new Client()
// Using client.poolPair.
const something = await client.poolPair.method()
```

## listPoolPairs

Returns information about pools

```ts title="client.poolPair.listPoolPairs()"
interface poolPair {
  listPoolPairs (
    pagination: PoolPairPagination = {
      start: 0,
      including_start: true,
      limit: 100
    },
    verbose = true,
  ): Promise<IPoolShare>
}

export interface IPoolPair {
  [id: string]: {
    symbol: string
    name: string
    status: string
    idTokenA: string
    idTokenB: string
    reserveA: BigNumber
    reserveB: BigNumber
    commission: BigNumber
    totalLiquidity: BigNumber
    ['reserveA/reserveB']: BigNumber
    ['reserveB/reserveA']: BigNumber
    tradeEnabled: boolean
    ownerAddress: string
    blockCommissionA: BigNumber
    blockCommissionB: BigNumber
    rewardPct: BigNumber
    customRewards: BigNumber
    creationTx: string
    creationHeight: number
  }
}

interface PoolPairPagination {
  start: number
  including_start: boolean
  limit: number
}
```

## getPoolPair

Returns information about pools

```ts title="client.poolPair.getPoolPair()"
interface poolPair {
  getPoolPair (symbol: string, verbose = true): Promise<IPoolPair> {
}
```

## listPoolShares

Returns information about pools

```ts title="client.poolPair.listPoolShares()"
interface poolPair {
  listPoolShares (
    pagination: PoolPairPagination = {
      start: 0,
      including_start: true,
      limit: 100
    },
    verbose = true,
    isMineOnly = false): Promise<IPoolPair> {
}: Promise<IPoolShare>
```