import { BigNumber, JellyfishClient } from '../.'

/**
 * Wallet related RPC calls for DeFiChain
 */
export class Wallet {
  private readonly client: JellyfishClient

  constructor (client: JellyfishClient) {
    this.client = client
  }

  /**
   * Returns the total available balance in wallet.
   *
   * @param minimumConfirmation to include transactions confirmed at least this many times
   * @param includeWatchOnly for watch-only wallets
   * @return Promise<number>
   */
  async getBalance (minimumConfirmation: number = 0, includeWatchOnly: boolean = false): Promise<BigNumber> {
    return await this.client.call('getbalance', ['*', minimumConfirmation, includeWatchOnly], 'bignumber')
  }
}
