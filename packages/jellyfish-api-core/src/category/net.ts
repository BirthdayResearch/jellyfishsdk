import { ApiClient } from '../.'

/**
 * Net RPCs for DeFi Blockchain
 */
export class Net {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Returns the number of connections to other nodes.
   *
   * @return {Promise<number>}
   */
  async getConnectionCount (): Promise<number> {
    return await this.client.call('getconnectioncount', [], 'number')
  }
}
