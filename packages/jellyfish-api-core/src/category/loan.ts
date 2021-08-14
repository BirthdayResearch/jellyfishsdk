import { ApiClient } from '../.'
import BigNumber from 'bignumber.js'

/**
 * loan RPCs for DeFi Blockchain
 */
export class Loan {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Updates an existing loan scheme.
   *
   * @param {number} minColRatio
   * @param {BigNumber} interestRate
   * @param {UpdateLoanSchemeOptions} [options]
   * @param {string} options.id
   * @param {number} [options.activateAfterBlock]
   * @param {UTXO[]} [options.utxos = []]
   * @param {string} [options.utxos.txid]
   * @param {number} [options.utxos.vout]
   * @return {Promise<string>}
   */
  async updateLoanScheme (minColRatio: number, interestRate: BigNumber, options: UpdateLoanSchemeOptions): Promise<string> {
    const { activateAfterBlock = undefined, utxos = [] } = options
    return await this.client.call('updateloanscheme', [minColRatio, interestRate, options.id, activateAfterBlock, utxos], 'bignumber')
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
