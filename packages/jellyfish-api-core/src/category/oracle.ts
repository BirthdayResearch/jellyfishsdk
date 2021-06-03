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
   * @return {Promise<string>}
   */
  async updateOracle (oracleid: string, address: string, options: UpdateOracleOptions = {}): Promise<string> {
    const { utxos = [] } = options
    return await this.client.call('updateoracle', [oracleid, address, options.priceFeeds, options.weightage, utxos], 'number')
  }
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
