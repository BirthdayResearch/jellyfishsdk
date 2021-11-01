import { ApiClient } from '../.'
import BigNumber from 'bignumber.js'

export enum OracleRawPriceState {
  LIVE = 'live',
  EXPIRED = 'expired'
}

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
   * @return {Promise<string>} oracleId, also the txn id for txn created to appoint oracle
   */
  async appointOracle (address: string, priceFeeds: OraclePriceFeed[], options: AppointOracleOptions = {}): Promise<string> {
    const { utxos = [] } = options
    return await this.client.call('appointoracle', [address, priceFeeds, options.weightage, utxos], 'number')
  }

  /**
   * Removes oracle.
   *
   * @param {string} oracleId
   * @param {UTXO[]} [utxos = []]
   * @param {string} [utxos.txid]
   * @param {number} [utxos.vout]
   * @return {Promise<string>} txid
   */
  async removeOracle (oracleId: string, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('removeoracle', [oracleId, utxos], 'number')
  }

  /**
   * Update a price oracle for rely of real time price data.
   *
   * @param {string} oracleId
   * @param {string} address
   * @param {UpdateOracleOptions} [options]
   * @param {OraclePriceFeed[]} options.priceFeeds
   * @param {number} options.weightage
   * @param {UTXO[]} [options.utxos = []]
   * @param {string} [options.utxos.txid]
   * @param {number} [options.utxos.vout]
   * @return {Promise<string>} txid
   */
  async updateOracle (oracleId: string, address: string, options: UpdateOracleOptions = {}): Promise<string> {
    const { utxos = [] } = options
    return await this.client.call('updateoracle', [oracleId, address, options.priceFeeds, options.weightage, utxos], 'number')
  }

  /**
   * Set oracle data transaction.
   *
   * @param {string} oracleId
   * @param {number} timestamp timestamp in seconds
   * @param {SetOracleDataOptions} [options]
   * @param {OraclePrice[]} options.prices
   * @param {UTXO[]} [options.utxos = []]
   * @param {string} [options.utxos.txid]
   * @param {number} [options.utxos.vout]
   * @return {Promise<string>} txid
   */
  async setOracleData (oracleId: string, timestamp: number, options: SetOracleDataOptions = {}): Promise<string> {
    const { utxos = [] } = options
    return await this.client.call('setoracledata', [oracleId, timestamp, options.prices, utxos], 'number')
  }

  /**
   * Returns oracle data.
   *
   * @param {string} oracleId
   * @return {Promise<OracleData>}
   */
  async getOracleData (oracleId: string): Promise<OracleData> {
    return await this.client.call('getoracledata', [oracleId], 'number')
  }

  /**
   * Returns array of oracle ids.
   *
   * @return {Promise<string[]>}
   */
  async listOracles (): Promise<string[]> {
    return await this.client.call('listoracles', [], 'number')
  }

  /**
   * Returns latest raw price updates from oracles.
   *
   * @param {OraclePriceFeed} [priceFeed]
   * @return {Promise<OracleRawPrice[]>}
   */
  async listLatestRawPrices (priceFeed?: OraclePriceFeed): Promise<OracleRawPrice[]> {
    const params = priceFeed !== undefined && priceFeed !== null ? [priceFeed] : []
    return await this.client.call('listlatestrawprices', params, 'bignumber')
  }

  /**
   * Returns aggregated price from oracles.
   *
   * @param {OraclePriceFeed} priceFeed
   * @return {Promise<BigNumber>}
   */
  async getPrice (priceFeed: OraclePriceFeed): Promise<BigNumber> {
    return await this.client.call('getprice', [priceFeed], 'bignumber')
  }

  /**
   * List all aggregated prices.
   *
   * @return {Promise<ListPricesData[]>}
   */
  async listPrices (): Promise<ListPricesData[]> {
    return await this.client.call('listprices', [], 'bignumber')
  }

  /**
   * Get fixed interval price.
   *
   * @param {string} id Price feed id
   * @return {Promsie<FixedIntervalPrice>}
   */
  async getFixedIntervalPrice (id: string): Promise<FixedIntervalPrice> {
    return await this.client.call('getfixedintervalprice', [id], {
      activePrice: 'bignumber',
      nextPrice: 'bignumber'
    })
  }

  /**
   * List all fixed interval prices.
   *
   * @param {FixedIntervalPricePagination} pagination
   * @param {string} [pagination.start]
   * @param {string} [pagination.limit = 100] Maximum number of orders to return.
   * @return {Promise<ListFixedIntervalPrice[]}
   */
  async listFixedIntervalPrices (
    pagination: FixedIntervalPricePagination = {
      limit: 100
    }): Promise<ListFixedIntervalPrice[]> {
    return await this.client.call('listfixedintervalprices', [pagination], {
      activePrice: 'bignumber',
      nextPrice: 'bignumber'
    })
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

export interface OracleData {
  oracleid: string
  address: string
  priceFeeds: OraclePriceFeed[]
  tokenPrices: OracleTokenPrice[]
  weightage: number
}

export interface OracleRawPrice {
  oracleid: string
  priceFeeds: OraclePriceFeed
  rawprice: BigNumber
  weightage: BigNumber
  state: OracleRawPriceState
  timestamp: BigNumber
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

export interface OracleTokenPrice {
  token: string
  currency: string
  /**
   * @example 0.5
   */
  amount: number
  /**
   * @example 1623161076 is an Epoch time which every digit represents a second.
   */
  timestamp: number
}

export interface ListPricesData {
  token: string
  currency: string
  /**
   * @example new BigNumber(0.83333333000000)
   */
  price?: BigNumber
  /**
   * @example true or display error msg if false
   */
  ok: boolean | string
}

export interface FixedIntervalPrice {
  activePriceBlock: number
  nextPriceBlock: number
  fixedIntervalPriceId: string
  activePrice: BigNumber
  nextPrice: BigNumber
  timestamp: number
  isLive: boolean
}

export interface ListFixedIntervalPrice {
  priceFeedId: string
  activePrice: BigNumber
  nextPrice: BigNumber
  timestamp: number
  isLive: boolean
}

export interface FixedIntervalPricePagination {
  start?: string
  limit?: number
}
