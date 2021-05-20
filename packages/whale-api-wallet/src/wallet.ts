import { WalletAccount, WalletAccountProvider, WalletHdNode } from '@defichain/jellyfish-wallet'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { Network } from '@defichain/jellyfish-network'

export class WhaleWalletAccount extends WalletAccount {
  constructor (public readonly client: WhaleApiClient, hdNode: WalletHdNode, network: Network) {
    super(hdNode, network)
  }

  async isActive (): Promise<boolean> {
    const address = await this.getAddress()
    const agg = await this.client.address.getAggregation(address)
    return agg !== undefined
  }
}

export class WhaleWalletAccountProvider implements WalletAccountProvider<WhaleWalletAccount> {
  constructor (
    protected readonly client: WhaleApiClient,
    protected readonly network: Network
  ) {
  }

  provide (hdNode: WalletHdNode): WhaleWalletAccount {
    return new WhaleWalletAccount(this.client, hdNode, this.network)
  }
}
