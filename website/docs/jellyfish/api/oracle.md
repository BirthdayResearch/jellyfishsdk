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

Creates an oracle appointment transaction and saves it to the database.

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
