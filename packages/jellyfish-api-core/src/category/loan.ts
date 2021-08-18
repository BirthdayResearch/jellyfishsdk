import { ApiClient } from '../.'

/**
 * Loan RPCs for DeFi Blockchain
 */
export class Loan {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Destroys a loan scheme.
   *
   * @param {string} id Unique identifier of the loan scheme, max 8 chars
   * @param {number} [activateAfterBlock] Block height at which new changes take effect
   * @param {DeleteLoanSchemeOptions} [options]
   * @param {UTXO[]} [options.utxos = []] Specific UTXOs to spend
   * @param {string} [options.utxos.txid] Transaction Id
   * @param {number} [options.utxos.vout] Output number
   * @return {Promise<string>} Hex string of the transaction
   */
  async destroyLoanScheme (id: string, activateAfterBlock?: number, options: DeleteLoanSchemeOptions = {}): Promise<string> {
    const { utxos = [] } = options
    return await this.client.call('destroyloanscheme', [id, activateAfterBlock, utxos], 'number')
  }
}

export interface DeleteLoanSchemeOptions {
  utxos?: UTXO[]
}

export interface UTXO {
  txid: string
  vout: number
}
