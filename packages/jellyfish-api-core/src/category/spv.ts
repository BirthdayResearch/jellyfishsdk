import { ApiClient } from '../.'

/**
 * SPV RPCs for DeFi Blockchain
 */
export class Spv {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Creates and adds a Bitcoin address to the SPV wallet.
   *
   * @return {Promise<string>} Returns a new Bitcoin address
   */
  async getNewAddress (): Promise<string> {
    return await this.client.call('spv_getnewaddress', [], 'number')
  }
}
