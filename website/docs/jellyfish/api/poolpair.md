---
id: poolpair
title: Pool Pair API
sidebar_label: Pool Pair API
slug: /jellyfish/api/poolpair
---

```js
import {Client} from '@defichain/jellyfish'
const client = new Client()
// Using client.poolpair.
const something = await client.poolpair.method()
```

## listPoolPairs

Returns information about pools

```ts title="client.poolpair.listPoolPairs()"
interface poolpair {
  listPoolPairs (
    pagination: PoolPairPagination = {
      start: 0,
      including_start: true,
      limit: 100
    },
    verbose = true,
  ): Promise<PoolPairsResult>
}

interface PoolPairsResult {
  [id: string]: PoolPairInfo
}

interface PoolPairInfo {
  symbol: string
  name: string
  status: string
  idTokenA: string
  idTokenB: string
  reserveA: BigNumber
  reserveB: BigNumber
  commission: BigNumber
  totalLiquidity: BigNumber
  'reserveA/reserveB': BigNumber
  'reserveB/reserveA': BigNumber
  tradeEnabled: boolean
  ownerAddress: string
  blockCommissionA: BigNumber
  blockCommissionB: BigNumber
  rewardPct: BigNumber
  customRewards?: string[]
  creationTx: string
  creationHeight: number
}

interface PoolPairPagination {
  start: number
  including_start: boolean
  limit: number
}
```

## getPoolPair

Returns information about pools

```ts title="client.poolpair.getPoolPair()"
interface poolpair {
  getPoolPair (symbol: string, verbose = true): Promise<PoolPairsResult>
}

interface PoolPairsResult {
  [id: string]: PoolPairInfo
}

interface PoolPairInfo {
  symbol: string
  name: string
  status: string
  idTokenA: string
  idTokenB: string
  reserveA: BigNumber
  reserveB: BigNumber
  commission: BigNumber
  totalLiquidity: BigNumber
  'reserveA/reserveB': BigNumber
  'reserveB/reserveA': BigNumber
  tradeEnabled: boolean
  ownerAddress: string
  blockCommissionA: BigNumber
  blockCommissionB: BigNumber
  rewardPct: BigNumber
  customRewards?: string[]
  creationTx: string
  creationHeight: number
}
```


## addPoolLiquidity

Add pool liquidity transaction

```ts title="client.poolpair.addPoolLiquidity()"
interface poolpair {
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

```ts title="client.poolpair.listPoolShares()"
interface poolpair {
  listPoolShares (
    pagination: PoolPairPagination = {
      start: 0,
      including_start: true,
      limit: 100
    },
    verbose = true,
    options: PoolShareOptions = {},
  ): Promise<PoolSharesResult>
}

interface PoolSharesResult {
  [id: string]: PoolShareInfo
}

interface PoolShareInfo {
  poolID: string
  owner: string
  '%': BigNumber
  amount: BigNumber
  totalLiquidity: BigNumber
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

## testPoolSwap

Create a test pool swap transaction to check pool swap's return result

```ts title="client.poolpair.testPoolSwap()"
interface poolpair {
  testPoolSwap (metadata: TestPoolSwapMetadata): Promise<string>
}

interface TestPoolSwapMetadata {
  from: string
  tokenFrom: string
  amountFrom: number
  to: string
  tokenTo: string
  maxPrice?: number
}
```

## removePoolLiquidity

Remove pool liquidity transaction

```ts title="client.poolpair.removePoolLiquidity()"
interface poolpair {
  removePoolLiquidity (address: string, poolAccount: string, options: RemovePoolLiquidityOptions = {}): Promise<string>
}

interface RemovePoolLiquidityOptions {
  utxos?: RemovePoolLiquidityUTXO[]
}

interface RemovePoolLiquidityUTXO {
  txid: string
  vout: number
}
```
