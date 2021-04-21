import { WalletAccount, WalletAccountProvider, WalletHdNode } from '@defichain/jellyfish-wallet'
import { Network } from '@defichain/jellyfish-network'
import { HRP, toBech32 } from '@defichain/jellyfish-crypto'

/**
 * jellyfish-api-ocean implementation of WalletAccount.
 * All stateless and stateful node service is provided by an ocean instance.
 */
export class OceanWalletAccount implements WalletAccount {
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
    return toBech32(pubKey, this.network.bech32.hrp as HRP)
  }

  async isActive (): Promise<boolean> {
    throw new Error('to be implemented')
  }
}

/**
 * Provide OceanWalletAccount with upstream to DeFi ocean services.
 */
export class OceanWalletAccountProvider implements WalletAccountProvider<OceanWalletAccount> {
  private readonly network: Network

  // TODO(fuxingloh): to implement after 'jellyfish-api-ocean'

  constructor (network: Network) {
    this.network = network
  }

  provide (hdNode: WalletHdNode): OceanWalletAccount {
    return new OceanWalletAccount(hdNode, this.network)
  }
}
