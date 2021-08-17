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
   * @param {number} minColRatio
   * @param {BigNumber} interestRate
   * @param {CreateLoanSchemeOptions} options
   * @param {string} options.id
   * @param {UTXO[]} [options.utxos = []]
   * @param {string} [options.utxos.txid]
   * @param {number} [options.utxos.vout]
   * @return {Promise<string>} loanSchemeId, also the txn id for txn created to create loan scheme
   */
  async createLoanScheme (minColRatio: number, interestRate: BigNumber, options: CreateLoanSchemeOptions): Promise<string> {
    const { utxos = [] } = options
    return await this.client.call('createloanscheme', [minColRatio, interestRate, options.id, utxos], 'number')
  }
}

export interface CreateLoanSchemeOptions {
  id: string
  utxos?: UTXO[]
}

export interface UTXO {
  txid: string
  vout: number
}
