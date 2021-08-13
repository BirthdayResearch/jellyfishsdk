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

## createLoanScheme

Creates a loan scheme transaction.

```ts title="client.oracle.createLoanScheme()"
interface loan {
  createLoanScheme (minColRatio: number, interestRate: BigNumber, options: CreateLoanSchemeOptions): Promise<string>
}

interface CreateLoanSchemeOptions {
  id: string
  utxos?: UTXO[]
}

interface UTXO {
  txid: string
  vout: number
}
```
