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
   * @param {OraclePriceFeed[]} priceFeeds
   * @param {AppointOracleOptions} [options]
   * @param {number} options.weightage
   * @param {UTXO[]} [options.utxos = []]
   * @param {string} [options.utxos.txid]
   * @param {number} [options.utxos.vout]
   * @return {Promise<string>} oracleid, also the txn id for txn created to appoint oracle
   */
  async appointOracle (address: string, priceFeeds: OraclePriceFeed[], options: AppointOracleOptions = {}): Promise<string> {
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
   * @param {OraclePriceFeed[]} options.priceFeeds
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

  /**
   * Set oracle data transaction.
   *
   * @param {string} oracleid
   * @param {number} timestamp
   * @param {SetOracleDataOptions} [options]
   * @param {OraclePrice[]} options.prices
   * @param {UTXO[]} [options.utxos = []]
   * @param {string} [options.utxos.txid]
   * @param {number} [options.utxos.vout]
   * @return {Promise<string>} txid
   */
  async setOracleData (oracleid: string, timestamp: number, options: SetOracleDataOptions = {}): Promise<string> {
    const { utxos = [] } = options
    return await this.client.call('setoracledata', [oracleid, timestamp, options.prices, utxos], 'number')
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
