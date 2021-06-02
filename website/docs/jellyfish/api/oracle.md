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

Creates an appoint oracle transaction and saves the oracle to database.

```ts title="client.oracle.appointOracle()"
interface oracle {
  appointOracle (address: string, pricefeeds: PriceFeeds[], options: AppointOracleOptions = {}): Promise<string>
}

interface PriceFeeds {
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
