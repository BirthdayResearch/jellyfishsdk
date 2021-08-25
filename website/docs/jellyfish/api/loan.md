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

```ts title="client.loan.createLoanScheme()"
interface loan {
  createLoanScheme (scheme: CreateLoanScheme, utxos: UTXO[] = []): Promise<string>
}

interface CreateLoanScheme {
  minColRatio: number
  interestRate: BigNumber
  id: string
}

interface UTXO {
  txid: string
  vout: number
}
```

## listLoanSchemes

List all available loan schemes.

```ts title="client.loan.listLoanSchemes()"
interface loan {
  listLoanSchemes (): Promise<LoanSchemeResult[]>
}

interface LoanSchemeResult {
  id: string
  mincolratio: BigNumber
  interestrate: BigNumber
  default: boolean
}
```

## updateLoanToken

Updates an existing loan token.

```ts title="client.loan.updateLoanToken()"
interface loan {
  updateLoanToken (loanToken: UpdateLoanToken, utxos: UTXO[] = []): Promise<string>
}

interface UpdateLoanToken {
  token: string
  symbol: string
  name: string
  priceFeedId: string
  mintable?: boolean
  interest?: BigNumber
}

interface UTXO {
  txid: string
  vout: number
}
```
