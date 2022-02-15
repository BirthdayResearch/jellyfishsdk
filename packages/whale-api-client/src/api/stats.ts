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
   * @return {Promise<BlockRewardDistribution}
   */
  async getSupply (): Promise<SupplyData> {
    return await this.client.requestData('GET', 'stats/supply')
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
