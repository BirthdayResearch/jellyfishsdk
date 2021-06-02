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
   * Creates an oracle appointment transaction and saves it to the database.
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
