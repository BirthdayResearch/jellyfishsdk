---
id: governance
title: Governance API
sidebar_label: Governance API
slug: /jellyfish/api/governance
---

```js
import {Client} from '@defichain/jellyfish'
const client = new Client()

// Using client.governance.
const something = await client.governance.method()
```

## createCfp

Creates a Cummunity Fund Request.

```ts title="client.governance.createCfp()"
interface governance {
  createCfp (data: CFPData, utxos: UTXO[] = []): Promise<string>
}

interface CFPData {
  title: string
  amount: BigNumber
  payoutAddress: string
  cycles?: number
}

interface UTXO {
  txid: string
  vout: number
}
```