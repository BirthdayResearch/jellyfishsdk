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

## updateLoanScheme

Updates an existing loan scheme.

```ts title="client.loan.updateLoanScheme()"
interface loan {
  updateLoanScheme (scheme: UpdateLoanScheme, utxos: UTXO[] = []): Promise<string>
}

interface UpdateLoanScheme {
  minColRatio: number
  interestRate: BigNumber
  id: string
  activateAfterBlock?: number
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

## getLoanScheme

Get loan scheme.

```ts title="client.loan.getLoanScheme()"
interface loan {
  getLoanScheme (id: string): Promise<GetLoanSchemeResult>
}

interface GetLoanSchemeResult {
  id: string
  interestrate: BigNumber
  mincolratio: BigNumber
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

## setCollateralToken

Set a collateral token transaction.

```ts title="client.loan.setCollateralToken()"
interface loan {
  setCollateralToken (collateralToken: SetCollateralToken, utxos: UTXO[] = []): Promise<string>
}

interface SetCollateralToken {
  token: string
  factor: BigNumber
  priceFeedId: string
  activateAfterBlock?: number
}

interface UTXO {
  txid: string
  vout: number
}
```

## listCollateralTokens

List collateral tokens.

```ts title="client.loan.listCollateralTokens()"
interface loan {
  listCollateralTokens (): Promise<CollateralTokensData>
}

interface CollateralTokensData {
  [key: string]: CollateralTokenDetails
}

interface CollateralTokenDetails {
  token: string
  factor: BigNumber
  priceFeedId: string
  activateAfterBlock: BigNumber
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
  getCollateralToken (collateralToken: GetCollateralToken = {}): Promise<CollateralTokenDetails>
}

interface GetCollateralToken {
  token?: string
  height?: number
}

interface CollateralTokenDetails {
  token: string
  factor: BigNumber
  priceFeedId: string
  activateAfterBlock: BigNumber
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
  name?: string
  priceFeedId: string
  mintable?: boolean
  interest?: BigNumber
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
  listLoanTokens (): Promise<ListLoanTokenResult[]>
}

interface ListLoanTokenResult {
  [key: string]: LoanTokenDetails
}

interface LoanTokenDetails {
  token: token.TokenResult
  priceFeedId: string
  interest: BigNumber
}

interface TokenResult {
  [id: string]: TokenInfo
}

interface TokenInfo {
  symbol: string
  symbolKey: string
  name: string
  decimal: BigNumber
  limit: BigNumber
  mintable: boolean
  tradeable: boolean
  isDAT: boolean
  isLPS: boolean
  isLoanToken: boolean
  finalized: boolean
  minted: BigNumber
  creationTx: string
  creationHeight: BigNumber
  destructionTx: string
  destructionHeight: BigNumber
  collateralAddress: string
}
```

## createVault

Creates a vault transaction.

```ts title="client.loan.createVault()"
interface loan {
  createVault (vault: CreateVault, utxos: UTXO[] = []): Promise<string>
}
interface CreateVault {
  ownerAddress: string
  loanSchemeId?: string
}
interface UTXO {
  txid: string
  vout: number
}
```