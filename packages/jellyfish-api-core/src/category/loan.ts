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
   * Updates an existing loan scheme.
   *
   * @param {number} minColRatio Minimum collateralization ratio
   * @param {BigNumber} interestRate Interest rate
   * @param {UpdateLoanSchemeOptions} options
   * @param {string} options.id Unique identifier of the loan scheme, max 8 chars
   * @param {number} [options.activateAfterBlock] Block height at which new changes take effect
   * @param {UTXO[]} [options.utxos = []] Specific UTXOs to spend
   * @param {string} options.utxos.txid Transaction Id
   * @param {number} options.utxos.vout Output number
   * @return {Promise<string>} Hex string of the transaction
   */
  async updateLoanScheme (minColRatio: number, interestRate: BigNumber, options: UpdateLoanSchemeOptions): Promise<string> {
    const { id, activateAfterBlock, utxos = [] } = options
    return await this.client.call('updateloanscheme', [minColRatio, interestRate, id, activateAfterBlock, utxos], 'number')
  }
}

export interface UpdateLoanSchemeOptions {
  id: string
  activateAfterBlock?: number
  utxos?: UTXO[]
}

export interface UTXO {
  txid: string
  vout: number
}
