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
   * @return {Promise<string>} oracleid
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
   * @return {Promise<string>} oracleid
   */
  async removeOracle (oracleid: string, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('removeoracle', [oracleid, utxos], 'number')
  }

  /**
   * Returns oracle data in json form.
   *
   * @param {string} oracleid
   * @return {Promise<string>} txn id for txn created to remove oracle
   */
  async getOracleData (oracleid: string): Promise<string> {
    return await this.client.call('getoracledata', [oracleid], 'number')
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

export interface UpdateOracleOptions {
  priceFeeds?: OraclePriceFeed[]
  weightage?: number
  utxos?: UTXO[]
}

export interface SetOracleDataOptions {
  prices?: OraclePrice[]
  utxos?: UTXO[]
}

export interface OraclePriceFeed {
  token: string
  currency: string
}

export interface OraclePrice {
  tokenAmount: string
  currency: string
}

export interface UTXO {
  txid: string
  vout: number
}
