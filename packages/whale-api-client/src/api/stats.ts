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
    fee: number
    emission: number
    address: number
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
