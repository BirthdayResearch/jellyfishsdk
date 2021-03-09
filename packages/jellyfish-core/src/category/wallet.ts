import { BigNumber, JellyfishClient } from '../core'

/**
 * Minting related RPC calls for DeFiChain
 */
export class Wallet {
  private readonly client: JellyfishClient

  constructor (client: JellyfishClient) {
    this.client = client
  }

  /**
   * Returns the total available balance.
   *
   * @param minimumConfirmation
   * @param includeWatchOnly
   * @return Promise<number>
   */
  async getBalance (minimumConfirmation: number = 0, includeWatchOnly: boolean = false): Promise<BigNumber> {
    return await this.client.call('getbalance', ['*', minimumConfirmation, includeWatchOnly], 'bignumber')
  }
}
