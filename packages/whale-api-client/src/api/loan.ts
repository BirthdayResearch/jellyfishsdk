import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'
import { TokenData } from './tokens'
import { ActivePrice } from './prices'

export class Loan {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * Paginate query loan schemes.
   *
   * @param {number} size of scheme to query
   * @param {string} next set of schemes
   * @return {Promise<ApiPagedResponse<LoanScheme>>}
   */
  async listScheme (size: number = 30, next?: string): Promise<ApiPagedResponse<LoanScheme>> {
    return await this.client.requestList('GET', 'loans/schemes', size, next)
  }

  /**
   * Get information about a scheme with given scheme id.
   *
   * @param {string} id scheme id to get
   * @return {Promise<LoanScheme>}
   */
  async getScheme (id: string): Promise<LoanScheme> {
    return await this.client.requestData('GET', `loans/schemes/${id}`)
  }

  /**
   * Paginate query loan collateral tokens.
   *
   * @param {number} size of collateral tokens to query
   * @param {string} next set of collateral tokens
   * @return {Promise<ApiPagedResponse<CollateralToken>>}
   */
  async listCollateralToken (size: number = 30, next?: string): Promise<ApiPagedResponse<CollateralToken>> {
    return await this.client.requestList('GET', 'loans/collaterals', size, next)
  }

  /**
   * Get information about a collateral token with given collateral token id.
   *
   * @param {string} id collateralToken id to get
   * @return {Promise<CollateralToken>}
   */
  async getCollateralToken (id: string): Promise<CollateralToken> {
    return await this.client.requestData('GET', `loans/collaterals/${id}`)
  }

  /**
   * Paginate query loan tokens.
   *
   * @param {number} size of loan token to query
   * @param {string} next set of loan tokens
   * @return {Promise<ApiPagedResponse<LoanToken>>}
   */
  async listLoanToken (size: number = 30, next?: string): Promise<ApiPagedResponse<LoanToken>> {
    return await this.client.requestList('GET', 'loans/tokens', size, next)
  }

  /**
   * Get information about a loan token with given loan token id.
   *
   * @param {string} id loanToken id to get
   * @return {Promise<LoanToken>}
   */
  async getLoanToken (id: string): Promise<LoanToken> {
    return await this.client.requestData('GET', `loans/tokens/${id}`)
  }

  /**
   * Paginate query loan vaults.
   *
   * @param {number} size of vaults to query
   * @param {string} next set of vaults
   * @return {Promise<ApiPagedResponse<LoanVaultActive | LoanVaultLiquidated>>}
   */
  async listVault (size: number = 30, next?: string): Promise<ApiPagedResponse<LoanVaultActive | LoanVaultLiquidated>> {
    return await this.client.requestList('GET', 'loans/vaults', size, next)
  }

  /**
   * Get information about a vault with given vault id.
   *
   * @param {string} id vault id to get
   * @return {Promise<LoanVaultActive | LoanVaultLiquidated>}
   */
  async getVault (id: string): Promise<LoanVaultActive | LoanVaultLiquidated> {
    return await this.client.requestData('GET', `loans/vaults/${id}`)
  }

  /**
   * List vault auction history.
   *
   * @param {string} id vaultId
   * @param {number} height liquidation height
   * @param {number} batchIndex batch index
   * @param {number} size of auction batch index history
   * @param {string} next set of auction batch index history
   * @return {Promise<ApiPagedResponse<VaultAuctionBatchHistory>>}
   */
  async listVaultAuctionHistory (id: string, height: number, batchIndex: number, size: number = 30, next?: string): Promise<ApiPagedResponse<VaultAuctionBatchHistory>> {
    return await this.client.requestList('GET', `loans/vaults/${id}/auctions/${height}/batches/${batchIndex}/history`, size, next)
  }

  /**
   * Paginate query loan auctions.
   *
   * @param {number} size of auctions to query
   * @param {string} next set of auctions
   * @return {Promise<ApiPagedResponse<LoanVaultLiquidated>>}
   */
  async listAuction (size: number = 30, next?: string): Promise<ApiPagedResponse<LoanVaultLiquidated>> {
    return await this.client.requestList('GET', 'loans/auctions', size, next)
  }
}

export interface LoanScheme {
  id: string
  minColRatio: string
  interestRate: string
}

export interface CollateralToken {
  tokenId: string
  token: TokenData
  factor: string
  activateAfterBlock: number
  fixedIntervalPriceId: string
  activePrice?: ActivePrice
}

export interface LoanToken {
  tokenId: string
  token: TokenData
  interest: string
  fixedIntervalPriceId: string
  activePrice?: ActivePrice
}

export interface LoanVaultActive {
  vaultId: string
  loanScheme: LoanScheme
  ownerAddress: string
  state: LoanVaultState.ACTIVE | LoanVaultState.FROZEN | LoanVaultState.MAY_LIQUIDATE | LoanVaultState.UNKNOWN

  informativeRatio: string
  collateralRatio: string
  collateralValue: string
  loanValue: string
  interestValue: string

  collateralAmounts: LoanVaultTokenAmount[]
  loanAmounts: LoanVaultTokenAmount[]
  interestAmounts: LoanVaultTokenAmount[]
}

export interface LoanVaultLiquidated {
  vaultId: string
  loanScheme: LoanScheme
  ownerAddress: string
  state: LoanVaultState.IN_LIQUIDATION

  liquidationHeight: number
  liquidationPenalty: number
  batchCount: number
  batches: LoanVaultLiquidationBatch[]
}

export interface LoanVaultLiquidationBatch {
  index: number
  collaterals: LoanVaultTokenAmount[]
  loan: LoanVaultTokenAmount
  highestBid?: HighestBid
}

export enum LoanVaultState {
  UNKNOWN = 'UNKNOWN',
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  IN_LIQUIDATION = 'IN_LIQUIDATION',
  MAY_LIQUIDATE = 'MAY_LIQUIDATE'
}

export interface LoanVaultTokenAmount {
  id: string
  amount: string
  symbol: string
  displaySymbol: string
  symbolKey: string
  name: string
  activePrice?: ActivePrice
}

export interface HighestBid {
  owner: string
  amount: LoanVaultTokenAmount
}

export interface VaultAuctionBatchHistory {
  id: string
  key: string
  sort: string

  vaultId: string
  index: number
  from: string
  amount: string
  tokenId: number

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
