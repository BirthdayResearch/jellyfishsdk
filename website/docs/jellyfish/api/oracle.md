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
