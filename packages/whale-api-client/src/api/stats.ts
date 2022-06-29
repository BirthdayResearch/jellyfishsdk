import { WhaleApiClient } from '../whale.api.client'

export class Stats {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * Get stats of DeFi Blockchain
   *
   * @return {Promise<StatsData>}
   */
  async get (): Promise<StatsData> {
    return await this.client.requestData('GET', 'stats')
  }

  /**
   * Get supply of DeFi Blockchain
   *
   * @return {Promise<SupplyData>}
   */
  async getSupply (): Promise<SupplyData> {
    return await this.client.requestData('GET', 'stats/supply')
  }

  /**
   * Get burn info of DeFi Blockchain
   *
   * @return {Promise<BurnData>}
   */
  async getBurn (): Promise<BurnData> {
    return await this.client.requestData('GET', 'stats/burn')
  }
}

/**
 * Stats data, doesn't use BigNumber is precision is not expected.
 */
export interface StatsData {
  count: {
    blocks: number
    tokens: number
    prices: number
    masternodes: number
  }
  tvl: {
    total: number
    dex: number
    loan: number
    masternodes: number
  }
  burned: {
    total: number
    address: number
    fee: number
    auction: number
    payback: number
    emission: number
  }
  price: {
    usd: number
    /**
     * @deprecated use USD instead of aggregation over multiple pairs
     */
    usdt: number
  }
  masternodes: {
    locked: Array<{ weeks: number, tvl: number, count: number }>
  }
  emission: {
    total: number
    masternode: number
    dex: number
    community: number
    anchor: number
    burned: number
  }
  loan: {
    count: {
      schemes: number
      loanTokens: number
      collateralTokens: number
      openVaults: number
      openAuctions: number
    }
    value: {
      collateral: number
      loan: number
    }
  }
  blockchain: {
    difficulty: number
  }
  net: {
    version: number
    subversion: string
    protocolversion: number
  }
}

export interface SupplyData {
  /**
   * The maximum supply of DFI that is allowed to exist at anytime.
   * 1,200,000,000 as written in the white paper. Circulating amount will never be higher than this amount.
   */
  max: number

  /**
   * The total amount of DFI minted.
   */
  total: number

  /**
   * The total amount of all DFI that are burned.
   */
  burned: number

  /**
   * The amount of DFI that are publicly available and circulating in the market.
   * Total - Burned = Circulating
   */
  circulating: number
}

export interface BurnData {
  address: string
  /**
   * Amount send to burn address
   */
  amount: number
  /**
   * Token amount send to burn address; formatted as AMOUNT@SYMBOL
   */
  tokens: string[]
  /**
   * Amount collected via fee burn
   */
  feeburn: number
  /**
   * Amount collected via emission burn
   */
  emissionburn: number
  /**
   * Amount collected via auction burn
   */
  auctionburn: number
  /**
   * Value of burn after payback
   */
  paybackburn: number
  /**
   * Formatted as AMOUNT@SYMBOL
   */
  dexfeetokens: string[]
  /**
   * Amount of DFI collected from penalty resulting from paying DUSD using DFI
   */
  dfipaybackfee: number
  /**
   * Amount of tokens that are paid back; formatted as AMOUNT@SYMBOL
   */
  dfipaybacktokens: string[]
  /**
   * Amount of paybacks
   */
  paybackfees: string[]
  /**
   * Amount of tokens that are paid back
   */
  paybacktokens: string[]
  /**
   * Amount of tokens burned due to futureswap
   */
  dfip2203: string[]
}
