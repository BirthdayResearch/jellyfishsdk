import { ApiClient } from '..'

/**
 * Misc RPCs for DeFi Blockchain
 */
export class Misc {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * To dynamically change the time for testing
   *
   * @param {number} ts Unix epoch in seconds
   * @return Promise<void>
   */
  async setMockTime (ts: number): Promise<void> {
    const timestamp = ts.toString().length === 13 ? Math.floor(ts / 1e3) : ts
    return await this.client.call('setmocktime', [timestamp], 'number')
  }
}
