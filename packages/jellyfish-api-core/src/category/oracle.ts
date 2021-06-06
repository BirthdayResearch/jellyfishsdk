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
   * Update a price oracle for rely of real time price data.
   *
   * @param {string} oracleid
   * @param {string} address
   * @param {UpdateOracleOptions} [options]
   * @param {PriceFeed[]} options.priceFeeds
   * @param {number} options.weightage
   * @param {UTXO[]} [options.utxos = []]
   * @param {string} [options.utxos.txid]
   * @param {number} [options.utxos.vout]
   * @return {Promise<string>} txid
   */
  async updateOracle (oracleid: string, address: string, options: UpdateOracleOptions = {}): Promise<string> {
    const { utxos = [] } = options
    return await this.client.call('updateoracle', [oracleid, address, options.priceFeeds, options.weightage, utxos], 'number')
  }
}

export interface AppointOracleOptions {
  weightage?: number
  utxos?: UTXO[]
}

export interface UpdateOracleOptions {
  priceFeeds?: PriceFeed[]
  weightage?: number
  utxos?: UTXO[]
}

export interface PriceFeed {
  currency: string
  token: string
}

export interface UTXO {
  txid: string
  vout: number
}
