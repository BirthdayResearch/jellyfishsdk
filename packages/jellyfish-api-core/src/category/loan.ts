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

  async listCollateralTokens (): Promise<CollateralTokensData> {
    return await this.client.call('listcollateraltokens', [], 'number')
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

export interface CollateralTokensData {
  [key: string]: CollateralTokensDetail
}

export interface CollateralTokensDetail {
  token: string
  factor: number
  priceFeedId: string
  activateAfterBlock: number
}
