import { RegTestGenesisKeys } from '@defichain/jellyfish-network'
import { AbstractBot } from './AbstractBot'

/**
 * Bootstrap Foundation Keys
 */
export class FoundationBot extends AbstractBot {
  static Keys = RegTestGenesisKeys

  async bootstrap (): Promise<void> {
    for (const key of FoundationBot.Keys) {
      await this.apiClient.wallet.importPrivKey(key.owner.privKey, undefined, true)
      await this.apiClient.wallet.importPrivKey(key.operator.privKey, undefined, true)
    }
  }
}
