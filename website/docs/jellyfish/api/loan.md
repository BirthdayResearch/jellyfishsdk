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

## setLoanToken

Creates (and submits to local node and network) a token for a price feed set in collateral token.

```ts title="client.loan.setLoanToken()"
interface loan {
  setLoanToken (loanToken: SetLoanToken, utxos: UTXO[] = []): Promise<string>
}

interface SetLoanToken {
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