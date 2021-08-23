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
   * Get collateral token.
   *
   * @param {GetCollateralToken} getCollateralToken
   * @param {string} getCollateralToken.token Symbol or id of collateral token
   * @param {number} getCollateralToken.height Valid at specified height
   * @return {Promise<string>} CollateralToken
   */
  async getCollateralToken (getCollateralToken: GetCollateralToken): Promise<CollateralToken> {
    return await this.client.call('getcollateraltoken', [getCollateralToken], 'number')
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

export interface GetCollateralToken {
  token: string
  height: number
}

export interface CollateralToken {
  token: string
  factor: BigNumber
  priceFeedId: string
  activateAfterBlock?: number
}
