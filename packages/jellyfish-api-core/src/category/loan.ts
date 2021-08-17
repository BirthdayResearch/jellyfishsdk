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
   * @param {number} minColRatio Minimum collateralization ratio
   * @param {BigNumber} interestRate Interest rate
   * @param {CreateLoanSchemeOptions} options
   * @param {string} options.id Unique identifier of the loan scheme
   * @param {UTXO[]} [options.utxos = []] Specific UTXOs to spend
   * @param {string} [options.utxos.txid] Transaction Id
   * @param {number} [options.utxos.vout] Output number
   * @return {Promise<string>} LoanSchemeId, also the txn id for txn created to create loan scheme
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
