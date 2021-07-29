import { RegTestContainer } from './'

/**
 * SPV RPCs(test purposes only) for Bitcoin blockchain
 */
export class Spv {
  private readonly client: RegTestContainer

  constructor (client: RegTestContainer) {
    this.client = client
  }

  /**
   * Funds a Bitcoin address with 1 BTC(for test purposes only)
   *
   * @param {number} address A bitcoin address
   * @return {string} txid
   */
  async fundAddress (address: string): Promise<string> {
    return await this.client.call('spv_fundaddress', [address])
  }

  /**
   * Set last processed block height.
   *
   * @param {number} height BTC chain height
   */
  async setLastHeight (height: number): Promise<void> {
    return await this.client.call('spv_setlastheight', [height])
  }
}
