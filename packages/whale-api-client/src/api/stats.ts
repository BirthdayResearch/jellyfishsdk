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
    // TODO(fuxingloh): `masternodes: number` must be indexed via aggregator
  }
  tvl: {
    total: number
    dex: number
    // TODO(fuxingloh): `masternode: number` must be indexed via aggregator
  }
  burned: {
    total: number
    fee: number
    emission: number
    address: number
  }
  price: {
    usdt: number
  }
}
