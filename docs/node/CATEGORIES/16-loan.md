---
id: loan
title: Loan API
sidebar_label: Loan API
slug: /jellyfish/api/loan
---

```js
import {JsonRpcClient} from '@defichain/jellyfish-api-jsonrpc'
const client = new JsonRpcClient('http://foo:bar@localhost:8554')

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

## setCollateralToken

Set a collateral token transaction.

```ts title="client.loan.setCollateralToken()"
interface loan {
  setCollateralToken (collateralToken: SetCollateralToken, utxos: UTXO[] = []): Promise<string>
}

interface SetCollateralToken {
  token: string
  factor: BigNumber
  fixedIntervalPriceId: string
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
  listCollateralTokens (collateralToken: ListCollateralTokens = {}): Promise<CollateralTokenDetail[]>
}

interface ListCollateralTokens {
  height?: number
  all?: boolean
}

interface CollateralTokenDetail {
  token: string
  factor: BigNumber
  fixedIntervalPriceId: string
  activateAfterBlock: BigNumber
  tokenId: string
}
```

## getCollateralToken

Get collateral token.

```ts title="client.loan.getCollateralToken()"
interface loan {
  getCollateralToken (token: string): Promise<CollateralTokenDetail>
}

interface CollateralTokenDetail {
  token: string
  factor: BigNumber
  fixedIntervalPriceId: string
  activateAfterBlock: BigNumber
  tokenId: string
}
```

## getLoanInfo

Quick access to multiple API with consolidated total collateral and loan value.

```ts title="client.loan.getLoanInfo()"
interface loan {
  getLoanInfo (): Promise<GetLoanInfoResult>
}

interface GetLoanInfoResult {
  currentPriceBlock: BigNumber
  nextPriceBlock: BigNumber
  defaults: LoanConfig
  totals: LoanSummary
}

interface LoanConfig {
  fixedIntervalBlocks: BigNumber
  maxPriceDeviationPct: BigNumber
  minOraclesPerPrice: BigNumber
  scheme: string
}

interface LoanSummary {
  collateralTokens: BigNumber
  collateralValue: BigNumber
  loanTokens: BigNumber
  loanValue: BigNumber
  openAuctions: BigNumber
  openVaults: BigNumber
  schemes: BigNumber
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
  fixedIntervalPriceId: string
  mintable?: boolean
  interest?: BigNumber
}

interface UTXO {
  txid: string
  vout: number
}
```

## updateLoanToken

Updates an existing loan token.

```ts title="client.loan.updateLoanToken()"
interface loan {
  updateLoanToken (oldToken: string, newTokenDetails: UpdateLoanToken, utxos: UTXO[] = []): Promise<string>
}

interface UpdateLoanToken {
  symbol?: string
  name?: string
  fixedIntervalPriceId?: string
  mintable?: boolean
  interest?: BigNumber
}

interface UTXO {
  txid: string
  vout: number
}
```

## getInterest

Get interest info.

```ts title="client.loan.getInterest()"
interface loan {
  getInterest (id: string, token?: string): Promise<Interest[]>
}

interface Interest {
  token: string
  realizedInterestPerBlock: BigNumber
  totalInterest: BigNumber
  interestPerBlock: BigNumber
}
```

## getLoanToken

Get loan token.

```ts title="client.loan.getLoanToken()"
interface loan {
  getLoanToken (token: string): Promise<LoanTokenResult>
}

interface LoanTokenResult {
  token: token.TokenResult
  fixedIntervalPriceId: string
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

## listLoanTokens

List all created loan tokens.

```ts title="client.loan.listLoanTokens()"
interface loan {
  listLoanTokens (): Promise<LoanTokenResult[]>
}

interface LoanTokenResult {
  token: token.TokenResult
  fixedIntervalPriceId: string
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

## takeLoan

Take loan.

```ts title="client.loan.takeLoan()"
interface loan {
  takeLoan (metadata: TakeLoanMetadata, utxos: UTXO[] = []): Promise<string>
}

interface TakeLoanMetadata {
  vaultId: string
  amounts: string | string[] // amount@symbol
  to?: string
}

interface UTXO {
  txid: string
  vout: number
}
```

## paybackLoan

Return loan in a desired amount.

```ts title="client.loan.paybackLoan()"
interface loan {
  paybackLoan (metadata: PaybackLoanMetadata | PaybackLoanMetadataV2, utxos: UTXO[] = []): Promise<string>
}

interface PaybackLoanMetadata {
  vaultId: string
  amounts: string | string[] // amount@symbol
  from: string
}

interface TokenPaybackAmount {
  dToken: string
  amounts: string | string[] // amount@symbol
}

interface PaybackLoanMetadataV2 {
  vaultId: string
  from: string
  loans: TokenPaybackAmount[]
}

interface UTXO {
  txid: string
  vout: number
}
```
