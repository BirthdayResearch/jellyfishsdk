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

## updateLoanScheme

Updates an existing loan scheme.

```ts title="client.oracle.updateLoanScheme()"
interface loan {
  updateLoanScheme (mincolratio: number, interestRate: BigNumber, options: UpdateLoanSchemeOptions): Promise<string>
}

interface UpdateLoanSchemeOptions {
  id: string
  activateAfterBlock?: number
  utxos?: UTXO[]
}

interface UTXO {
  txid: string
  vout: number
}
```
