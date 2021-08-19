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

## listLoanSchemes

List all available loan schemes.

```ts title="client.loan.listLoanSchemes()"
interface loan {
  listLoanSchemes (): Promise<LoanSchemeResult[]>
}

interface LoanSchemeResult{
  id: string
  mincolratio: BigNumber
  interestrate: BigNumber
  default: boolean
}
```
