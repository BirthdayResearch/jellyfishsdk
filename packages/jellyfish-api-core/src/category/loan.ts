import { ApiClient } from '../.'
import BigNumber from 'bignumber.js'

/**
 * Loan RPCs for DeFi Blockchain
 */
export class Loan {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Creates a loan scheme transaction.
   *
   * @param {CreateLoanScheme} scheme
   * @param {number} scheme.minColRatio Minimum collateralization ratio
   * @param {BigNumber} scheme.interestRate Interest rate
   * @param {string} scheme.id Unique identifier of the loan scheme, max 8 chars
   * @param {UTXO[]} [utxos = []] Specific UTXOs to spend
   * @param {string} utxos.txid Transaction Id
   * @param {number} utxos.vout Output number
   * @return {Promise<string>} LoanSchemeId, also the txn id for txn created to create loan scheme
   */
  async createLoanScheme (scheme: CreateLoanScheme, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('createloanscheme', [scheme.minColRatio, scheme.interestRate, scheme.id, utxos], 'number')
  }

  /**
   * List all available loan schemes.
   *
   * @return {Promise<LoanSchemeResult[]>}
   */
  async listLoanSchemes (): Promise<LoanSchemeResult[]> {
    return await this.client.call('listloanschemes', [], 'bignumber')
  }

  /**
   * List all created loan tokens.
   *
   * @return {Promise<ListLoanTokenData[]>}
   */
  async listLoanTokens (): Promise<ListLoanTokenData> {
    return await this.client.call('listloantokens', [], 'bignumber')
  }
}

export interface CreateLoanScheme {
  minColRatio: number
  interestRate: BigNumber
  id: string
}

export interface UTXO {
  txid: string
  vout: number
}

export interface LoanSchemeResult {
  id: string
  mincolratio: BigNumber
  interestrate: BigNumber
  default: boolean
}

export interface ListLoanTokenData {
  [key: string]: ListLoanTokenDetail
}

export interface ListLoanTokenDetail {
  token: TokenData
  priceFeedId: string
  interest: BigNumber
}

export interface TokenData {
  [key: string]: TokenDetail
}

export interface TokenDetail {
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
