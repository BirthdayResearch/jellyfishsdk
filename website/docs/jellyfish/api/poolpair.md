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
  ): Promise<PoolPairResult>
}

interface PoolPairResult {
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
  getPoolPair (symbol: string, verbose = true): Promise<PoolPairResult>
}

interface PoolPairResult {
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
```

## addPoolLiquidity

Add pool liquidity transaction

```ts title="client.poolPair.addPoolLiquidity()"
interface poolPair {
  addPoolLiquidity (from: AddPoolLiquiditySource, shareAddress: string, options: AddPoolLiquidityOptions = {}): Promise<string>
}

interface AddPoolLiquiditySource {
  [address: string]: string | string[]
}

interface AddPoolLiquidityOptions {
  utxos?: AddPoolLiquidityUTXO[]
}

interface AddPoolLiquidityUTXO {
  txid: string
  vout: number
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
    options: PoolShareOptions = {},
  ): Promise<PoolShareResult>
}

interface PoolShareResult {
  [id: string]: {
    poolID: string
    owner: string
    ['%']: BigNumber
    amount: BigNumber
    totalLiquidity: BigNumber
  }
}

interface PoolPairPagination {
  start: number
  including_start: boolean
  limit: number
}

interface PoolShareOptions {
  isMineOnly?: boolean
}
```