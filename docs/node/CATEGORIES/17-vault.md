---
id: vault
title: Vault API
sidebar_label: Vault API
slug: /jellyfish/api/vault
---

```js
import {JsonRpcClient} from '@defichain/jellyfish-api-jsonrpc'
const client = new JsonRpcClient('http://foo:bar@localhost:8554')

// Using client.vault.
const something = await client.vault.method()
```

## createVault

Creates a vault transaction.

```ts title="client.vault.createVault()"
interface vault {
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

```ts title="client.vault.updateVault()"
interface vault {
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

```ts title="client.vault.getVault()"
interface vault {
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
  highestBid?: HighestBid
}

interface HighestBid {
  amount: string // amount@symbol
  owner: string
}
```

## listVaults

List all available vaults.

```ts title="client.vault.listVaults()"
interface vault {
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
  highestBid?: HighestBid
}

interface HighestBid {
  amount: string // amount@symbol
  owner: string
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

```ts title="client.vault.closeVault()"
interface vault {
  closeVault (closeVault: CloseVault, utxos: UTXO[] = []): Promise<string>
}

interface CloseVault {
  vaultId: string
  to: string
}
```

## depositToVault

Deposit to vault.

```ts title="client.vault.depositToVault()"
interface vault {
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

```ts title="client.vault.withdrawFromVault()"
interface vault {
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

## placeAuctionBid

Bid to vault in auction.

```ts title="client.vault.placeAuctionBid()"
interface vault {
  placeAuctionBid (placeAuctionBid: PlaceAuctionBid, utxos: UTXO[] = []): Promise<string>
}

interface PlaceAuctionBid {
  vaultId: string
  index: number
  from: string
  amount: string // amount@symbol
}

interface UTXO {
  txid: string
  vout: number
}
```

## listAuctions

List all available auctions.

```ts title="client.vault.listAuctions()"
interface vault {
  listAuctions (pagination: AuctionPagination = {}): Promise<VaultLiquidation[]>
}

enum VaultState {
  UNKNOWN = 'unknown',
  ACTIVE = 'active',
  IN_LIQUIDATION = 'inLiquidation',
  FROZEN = 'frozen',
  MAY_LIQUIDATE = 'mayLiquidate',
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

interface Vault {
  vaultId: string
  loanSchemeId: string
  ownerAddress: string
  state: VaultState
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
  highestBid?: HighestBid
}

interface HighestBid {
  amount: string // amount@symbol
  owner: string
}
```

## listAuctionHistory

Returns information about auction history.

```ts title="client.vault.listAuctionHistory()"
interface vault {
  listAuctionHistory (owner: string = 'mine', pagination?: ListAuctionHistoryPagination): Promise<ListAuctionHistoryDetail[]>
}

interface ListAuctionHistoryPagination {
  maxBlockHeight?: number
  vaultId?: string
  index?: number
  limit?: number
}

interface ListAuctionHistoryDetail {
  winner: string
  blockHeight: number
  blockHash: string
  blockTime: number
  vaultId: string
  batchIndex: number
  auctionBid: string
  auctionWon: string[]
}
```

## estimateCollateral

Returns amount of collateral tokens needed to take an amount of loan tokens for a target collateral ratio.

```ts title="client.vault.estimateCollateral()"
interface vault {
  estimateCollateral (loanAmounts: string[], targetRatio: number, tokenSplit: TokenPercentageSplit = { DFI: 1 }): Promise<string[]> // Returns array of token@amount`
}
interface TokenPercentageSplit {
  [token: string]: number // Token: split
}
```

## estimateLoan

Returns amount of loan tokens a vault can take depending on a target collateral ratio.

```ts title="client.vault.estimateLoan()"
interface vault {
  estimateLoan (vaultId: string, tokenSplit: TokenPercentageSplit, targetRatio?: number): Promise<string[]> // Returns array of token@amount`
}

interface TokenPercentageSplit {
  [token: string]: number // Token: split
}
```
