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
   * @return {Promise<string>}
   */
  async appointOracle (address: string, priceFeeds: PriceFeed[], options: AppointOracleOptions = {}): Promise<string> {
    const { utxos = [] } = options
    return await this.client.call('appointoracle', [address, priceFeeds, options.weightage, utxos], 'number')
  }

  async setOracleData (oracleid: string, timestamp: number, options: SetOracleDataOptions = {}): Promise<string> {
    const { utxos = [] } = options
    return await this.client.call('setoracledata', [oracleid, timestamp, options.price, utxos], 'number')
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
