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
   * Creates a price oracle for rely of real time price data.
   *
   * @param {string} address
   * @param {PriceFeed[]} priceFeeds
   * @param {AppointOracleOptions} [options]
   * @param {number} options.weightage
   * @param {UTXO[]} [options.utxos = []]
   * @param {string} [options.utxos.txid]
   * @param {number} [options.utxos.vout]
   * @return {Promise<string>} oracleid, also the txn id for txn created to appoint oracle
   */
  async appointOracle (address: string, priceFeeds: PriceFeed[], options: AppointOracleOptions = {}): Promise<string> {
    const { utxos = [] } = options
    return await this.client.call('appointoracle', [address, priceFeeds, options.weightage, utxos], 'number')
  }

  /**
   * Removes oracle.
   *
   * @param {string} oracleid
   * @param {UTXO[]} [utxos = []]
   * @param {string} [utxos.txid]
   * @param {number} [utxos.vout]
   * @return {Promise<string>} txid
   */
  async removeOracle (oracleid: string, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('removeoracle', [oracleid, utxos], 'number')
  }

  /**
   * Returns list of oracle ids.
   *
   * @return {Promise<string>} txid
   */
  async listOracles (): Promise<string> {
    return await this.client.call('listoracles', [], 'number')
  }
}

export interface PriceFeed {
  currency: string
  token: string
}

export interface AppointOracleOptions {
  weightage?: number
  utxos?: UTXO[]
}

export interface UTXO {
  txid: string
  vout: number
}
