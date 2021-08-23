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

## getCollateralToken

Get collateral token.

```ts title="client.loan.getCollateralToken()"
interface loan {
  getCollateralToken (getCollateralToken: GetCollateralToken): Promise<CollateralToken>
}

interface GetCollateralToken {
  token: string
  height: number
}

interface CollateralToken {
  token: string
  factor: BigNumber
  priceFeedId: string
  activateAfterBlock?: number
}
```
