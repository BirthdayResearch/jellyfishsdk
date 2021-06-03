import { ApiClient } from '../.'

/**
 * Oracle RPCs for DeFi Blockchain
 */
export class Oracle {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Removes oracle.
   *
   * @param {string} oracleid
   * @param {UTXO[]} [utxos = []]
   * @param {string} [utxos.txid]
   * @param {number} [utxos.vout]
   * @return {Promise<string>}
   */
  async removeOracle (oracleid: string, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('removeoracle', [oracleid, utxos], 'number')
  }
}

export interface UTXO {
  txid: string
  vout: number
}
