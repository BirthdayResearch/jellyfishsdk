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

## setDefaultLoanScheme

Sets the default loan scheme.

```ts title="client.loan.setDefaultLoanScheme()"
interface loan {
  setDefaultLoanScheme (id: string, utxos: UTXO[] = []): Promise<string>
}

interface UTXO {
  txid: string
  vout: number
}
```

## destroyLoanScheme

Destroys a loan scheme.

```ts title="client.loan.destroyLoanScheme()"
interface loan {
  destroyLoanScheme (scheme: DestroyLoanScheme, utxos: UTXO[] = []): Promise<string>
}

interface DestroyLoanScheme {
  id: string
  activateAfterBlock?: number
}

interface UTXO {
  txid: string
  vout: number
}
```

## listLoanTokens

List all created loan tokens.

```ts title="client.loan.listLoanTokens()"
interface loan {
  listLoanTokens (): Promise<ListLoanTokenData[]>
}

interface ListLoanTokenData {
  [key: string]: ListLoanTokenDetail
}

interface ListLoanTokenDetail {
  token: TokenData
  priceFeedId: string
  interest: BigNumber
}

interface TokenData {
  [key: string]: TokenDetail
}

interface TokenDetail {
  collateralAddress: string
  creationHeight: BigNumber
  creationTx: string
  decimal: BigNumber
  destructionHeight: BigNumber
  destructionTx: string
  finalized: false
  isDAT: boolean
  isLPS: boolean
  isLoanToken: boolean
  limit: BigNumber
  mintable: boolean
  minted: BigNumber
  name: string
  symbol: string
  symbolKey: string
  tradeable: boolean
}
```