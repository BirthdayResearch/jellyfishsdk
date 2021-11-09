import { RegTestContainer } from './'

/**
 * SPV RPCs(test purposes only) for Bitcoin blockchain
 */
export class SPV {
  static EXPIRATION = 10
  private readonly client: RegTestContainer
  private assummedSpvHeight: number

  constructor (client: RegTestContainer) {
    this.client = client
    this.assummedSpvHeight = 0
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
    this.assummedSpvHeight = height
    return await this.client.call('spv_setlastheight', [height])
  }

  async increaseSpvHeight (height: number = SPV.EXPIRATION): Promise<void> {
    return await this.setLastHeight(this.assummedSpvHeight + height)
  }
}
