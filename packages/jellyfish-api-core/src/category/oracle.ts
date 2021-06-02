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
   * Creates a appoint oracle transaction and saves oracle to database.
   * @param {string} [address]
   * @param {PriceFeeds} priceFeeds
   * @param {AppointOracleOptions} [options]
   * @param {number} [options.weightage]
   * @param {UTXO[]} [options.utxos = []]
   * @param {string} [options.utxos.txid]
   * @param {number} [options.utxos.vout]
   *
   * @return {Promise<string>}
   */
  async appointOracle (address: string, pricefeeds: PriceFeeds[], options: AppointOracleOptions): Promise<string> {
    // return await this.client.call('appointoracle', [address, pricefeeds, options.weightage, options.utxos = []], 'number')
    return 'abc'
  }
}

export interface PriceFeeds {
  currency: string
  token: string
}

export interface AppointOracleOptions {
  weightage: number
  utxos?: UTXO[]
}

export interface UTXO {
  txid: string
  vout: number
}
