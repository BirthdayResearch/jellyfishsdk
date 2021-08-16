---
id: loan
title: Loan API
sidebar_label: Loan API
slug: /jellyfish/api/loan
---

```js
import {Client} from '@defichain/jellyfish'
const client = new Client()

// Using client.loan.
const something = await client.loan.method()
```

## destroyLoanScheme

Destroys a loan scheme.

```ts title="client.loan.destroyLoanScheme()"
interface loan {
  destroyLoanScheme (id: string, activateAfterBlock?: number, options: DeleteLoanOptions = {}): Promise<string>
}

interface DeleteLoanOptions {
  utxos?: UTXO[]
}

interface UTXO {
  txid: string
  vout: number
}
```
