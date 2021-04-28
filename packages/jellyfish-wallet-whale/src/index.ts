import { WalletAccount, WalletAccountProvider, WalletHdNode } from '@defichain/jellyfish-wallet'
import { Network } from '@defichain/jellyfish-network'
import { HRP, Bech32 } from '@defichain/jellyfish-crypto'

/**
 * jellyfish-api-whale implementation of WalletAccount.
 * All stateless and stateful node service is provided by an ocean instance.
 */
export class WhaleWalletAccount implements WalletAccount {
  private readonly hdNode: WalletHdNode
  private readonly network: Network

  constructor (hdNode: WalletHdNode, network: Network) {
    this.hdNode = hdNode
    this.network = network
  }

  /**
   * @return {string} bech32 address
   */
  async getAddress (): Promise<string> {
    const pubKey = await this.hdNode.publicKey()
    return Bech32.fromPubKey(pubKey, this.network.bech32.hrp as HRP)
  }

  async isActive (): Promise<boolean> {
    throw new Error('to be implemented')
  }
}

/**
 * Provide WhaleWalletAccount with upstream to DeFi whale services.
 */
export class WhaleWalletAccountProvider implements WalletAccountProvider<WhaleWalletAccount> {
  private readonly network: Network

  // TODO(fuxingloh): to implement after 'jellyfish-api-whale'

  constructor (network: Network) {
    this.network = network
  }

  provide (hdNode: WalletHdNode): WhaleWalletAccount {
    return new WhaleWalletAccount(hdNode, this.network)
  }
}
