---
id: poolpair
title: Pool Pair API
sidebar_label: Pool Pair API
slug: /jellyfish/api/poolpair
---

```js
import {JsonRpcClient} from '@defichain/jellyfish-api-jsonrpc'
const client = new JsonRpcClient('http://foo:bar@localhost:8554')

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
  status: boolean
  idTokenA: string
  idTokenB: string
  dexFeePctTokenA?: BigNumber
  dexFeeInPctTokenA?: BigNumber
  dexFeeOutPctTokenA?: BigNumber
  dexFeePctTokenB?: BigNumber
  dexFeeInPctTokenB?: BigNumber
  dexFeeOutPctTokenB?: BigNumber
  reserveA: BigNumber
  reserveB: BigNumber
  commission: BigNumber
  totalLiquidity: BigNumber
  'reserveA/reserveB': BigNumber | string
  'reserveB/reserveA': BigNumber | string
  tradeEnabled: boolean
  ownerAddress: string
  blockCommissionA: BigNumber
  blockCommissionB: BigNumber
  rewardPct: BigNumber
  customRewards?: string[]
  creationTx: string
  creationHeight: BigNumber
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
  status: boolean
  idTokenA: string
  idTokenB: string
  dexFeePctTokenA?: BigNumber
  dexFeeInPctTokenA?: BigNumber
  dexFeeOutPctTokenA?: BigNumber
  dexFeePctTokenB?: BigNumber
  dexFeeInPctTokenB?: BigNumber
  dexFeeOutPctTokenB?: BigNumber
  reserveA: BigNumber
  reserveB: BigNumber
  commission: BigNumber
  totalLiquidity: BigNumber
  'reserveA/reserveB': BigNumber | string
  'reserveB/reserveA': BigNumber | string
  tradeEnabled: boolean
  ownerAddress: string
  blockCommissionA: BigNumber
  blockCommissionB: BigNumber
  rewardPct: BigNumber
  customRewards?: string[]
  creationTx: string
  creationHeight: BigNumber
}
```


## addPoolLiquidity

Add pool liquidity transaction

```ts title="client.poolpair.addPoolLiquidity()"
interface poolpair {
  addPoolLiquidity (from: AddPoolLiquiditySource, shareAddress: string, options: PoolLiquidityOptions = {}): Promise<string>
}

interface AddPoolLiquiditySource {
  [address: string]: string | string[]
}

interface PoolLiquidityOptions {
  utxos?: UTXO[]
}

interface UTXO {
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

## poolSwap
Creates a pool swap transaction with given metadata.

```ts title="client.poolpair.poolSwap()"
interface poolpair {
  poolSwap (metadata: PoolSwapMetadata, utxos: UTXO[] = []): Promise<string>
}

interface PoolSwapMetadata {
  from: string
  tokenFrom: string
  amountFrom: number
  to: string
  tokenTo: string
  maxPrice?: number
}

interface UTXO {
  txid: string
  vout: number
}
```

## compositeSwap

Creates a composite swap (swap between multiple poolpairs) transaction with given metadata.

```ts title="client.poolpair.compositeSwap()"
interface poolpair {
  compositeSwap (metadata: PoolSwapMetadata, utxos: UTXO[] = []): Promise<string>
}

interface PoolSwapMetadata {
  from: string
  tokenFrom: string
  amountFrom: number
  to: string
  tokenTo: string
  maxPrice?: number
}

interface UTXO {
  txid: string
  vout: number
}
```

## testPoolSwap

Create a test pool swap transaction to check pool swap's return result

```ts title="client.poolpair.testPoolSwap()"
interface poolpair {
  testPoolSwap (metadata: PoolSwapMetadata): Promise<string>
}

interface PoolSwapMetadata {
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
  removePoolLiquidity (address: string, poolAccount: string, options: PoolLiquidityOptions = {}): Promise<string>
}

interface PoolLiquidityOptions {
  utxos?: UTXO[]
}

interface UTXO {
  txid: string
  vout: number
}
```
