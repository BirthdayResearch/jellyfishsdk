---
id: oracle
title: Oracle API
sidebar_label: Oracle API
slug: /jellyfish/api/oracle
---

```js
import {Client} from '@defichain/jellyfish'
const client = new Client()

// Using client.oracle.
const something = await client.oracle.method()
```

## appointOracle

Creates a price oracle for rely of real time price data.

```ts title="client.oracle.appointOracle()"
interface oracle {
  appointOracle (address: string, priceFeeds: OraclePriceFeed[], options: AppointOracleOptions = {}): Promise<string>
}

interface OraclePriceFeed {
  token: string
  currency: string
}

interface AppointOracleOptions {
  weightage?: number
  utxos?: UTXO[]
}

interface UTXO {
  txid: string
  vout: number
}
```

## removeOracle

Removes oracle.

```ts title="client.oracle.removeOracle()"
interface oracle {
  removeOracle (oracleid: string, utxos: UTXO[] = []): Promise<string>
}

interface UTXO {
  txid: string
  vout: number
}
```

## updateOracle

Update a price oracle for rely of real time price data.

```ts title="client.oracle.updateOracle()"
interface oracle {
  updateOracle (oracleid: string, address: string, options: UpdateOracleOptions = {}): Promise<string>
}

interface UpdateOracleOptions {
  priceFeeds?: OraclePriceFeed[]
  weightage?: number
  utxos?: UTXO[]
}

interface OraclePriceFeed {
  token: string
  currency: string
}

interface UTXO {
  txid: string
  vout: number
}
```

## setOracleData

Set oracle data transaction.

```ts title="client.oracle.setOracleData()"
interface oracle {
  setOracleData (oracleid: string, timestamp: number, options: SetOracleDataOptions = {}): Promise<string>
}

interface SetOracleDataOptions {
  prices?: OraclePrice[]
  utxos?: UTXO[]
}

interface OraclePrice {
  tokenAmount: string
  currency: string
}

interface UTXO {
  txid: string
  vout: number
}
```

## getOracleData

Returns oracle data.

```ts title="client.oracle.getOracleData()"
interface oracle {
  getOracleData (oracleid: string): Promise<OracleData>
}

interface OracleData {
  oracleid: string
  address: string
  priceFeeds: OraclePriceFeed[]
  tokenPrices: OracleTokenPrice[]
  weightage: number
}

interface OraclePriceFeed {
  token: string
  currency: string
}

interface OracleTokenPrice {
  token: string
  currency: string
  amount: number
  timestamp: number
}
```

## listOracles

Returns array of oracle ids.

```ts title="client.oracle.listOracles()"
interface oracle {
  listOracles (): Promise<string[]>
}
```
