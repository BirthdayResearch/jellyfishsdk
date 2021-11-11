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

## updateVault

Create update vault transaction.

```ts title="client.loan.updateVault()"
interface loan {
  updateVault (vaultId: string, vault: UpdateVault, utxos: UTXO[] = []): Promise<string>
}

interface UpdateVault {
  ownerAddress?: string
  loanSchemeId?: string
}

interface UTXO {
  txid: string
  vout: number
}
```

## getVault

Returns information about vault.

```ts title="client.loan.getVault()"
interface loan {
  getVault (vaultId: string): Promise<VaultActive | VaultLiquidation>
}

enum VaultState {
  UNKNOWN = 'unknown',
  ACTIVE = 'active',
  IN_LIQUIDATION = 'inLiquidation',
  FROZEN = 'frozen',
  MAY_LIQUIDATE = 'mayLiquidate',
}

interface Vault {
  vaultId: string
  loanSchemeId: string
  ownerAddress: string
  state: VaultState
}

interface VaultActive extends Vault {
  collateralAmounts: string[]
  loanAmounts: string[]
  interestAmounts: string[]
  collateralValue: BigNumber
  loanValue: BigNumber
  interestValue: BigNumber
  collateralRatio: number
  informativeRatio: BigNumber
}

interface VaultLiquidation extends Vault {
  liquidationHeight: number
  liquidationPenalty: number
  batchCount: number
  batches: VaultLiquidationBatch[]
}

interface VaultLiquidationBatch {
  index: number
  collaterals: string[]
  loan: string
}
```

## listVaults

List all available vaults.

```ts title="client.loan.listVaults()"
interface loan {
  listVaults (pagination: VaultPagination = {}, options: ListVaultOptions = {}): Promise<Array<Vault | VaultActive | VaultLiquidation>>
}

enum VaultState {
  UNKNOWN = 'unknown',
  ACTIVE = 'active',
  IN_LIQUIDATION = 'inLiquidation',
  FROZEN = 'frozen',
  MAY_LIQUIDATE = 'mayLiquidate',
}

interface Vault {
  vaultId: string
  loanSchemeId: string
  ownerAddress: string
  state: VaultState
}

interface VaultActive extends Vault {
  collateralAmounts: string[]
  loanAmounts: string[]
  interestAmounts: string[]
  collateralValue: BigNumber
  loanValue: BigNumber
  interestValue: BigNumber
  collateralRatio: number
  informativeRatio: BigNumber
}

interface VaultLiquidation extends Vault {
  liquidationHeight: number
  liquidationPenalty: number
  batchCount: number
  batches: VaultLiquidationBatch[]
}

interface VaultLiquidationBatch {
  index: number
  collaterals: string[]
  loan: string
}

interface ListVaultOptions {
  ownerAddress?: string
  loanSchemeId?: string
  state?: VaultState
  verbose?: boolean
}

interface VaultPagination {
  start?: string
  including_start?: boolean
  limit?: number
}
```

## closeVault

Close vault.

```ts title="client.loan.closeVault()"
interface loan {
  closeVault (closeVault: CloseVault, utxos: UTXO[] = []): Promise<string>
}

interface CloseVault {
  vaultId: string
  to: string
}
```

## depositToVault

Deposit to vault.

```ts title="client.loan.depositToVault()"
interface loan {
  depositToVault (depositVault: DepositVault, utxos: UTXO[] = []): Promise<string>
}

interface DepositVault {
  vaultId: string
  from: string
  amount: string // amount@symbol
}

interface UTXO {
  txid: string
  vout: number
}
```

## withdrawFromVault

Withdraw from vault.

```ts title="client.loan.withdrawFromVault()"
interface loan {
  withdrawFromVault (withdrawVault: WithdrawVault, utxos: UTXO[] = []): Promise<string>
}

interface WithdrawVault {
  vaultId: string
  to: string
  amount: string // amount@symbol
}

interface UTXO {
  txid: string
  vout: number
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
  amounts: string // amount@symbol
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
  paybackLoan (metadata: PaybackLoanMetadata, utxos: UTXO[] = []): Promise<string>
}

interface PaybackLoanMetadata {
  vaultId: string
  amounts: string | string[] // amount@symbol
  from: string
}

interface UTXO {
  txid: string
  vout: number
}
```

## listAuctions

List all available auctions.

```ts title="client.loan.listAuctions()"
interface loan {
  listAuctions (pagination: AuctionPagination = {}): Promise<AuctionDetail[]>
}

interface AuctionPagination {
  start?: AuctionPaginationStart
  including_start?: boolean
  limit?: number
}

interface AuctionPaginationStart {
  vaultId?: string
  height?: number
}

interface AuctionDetail {
  vaultId: string
  batchCount: number
  liquidationPenalty: number
  liquidationHeight: number
  batches: VaultLiquidationBatch[]
  loanSchemeId: string
  ownerAddress: string
  state: string
}

interface VaultLiquidationBatch {
  index: number
  collaterals: string[]
  loan: string
}
```