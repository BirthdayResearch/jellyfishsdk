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
  appointOracle (address: string, priceFeeds: PriceFeed[], options: AppointOracleOptions = {}): Promise<string>
}

interface PriceFeed {
  currency: string
  token: string
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
