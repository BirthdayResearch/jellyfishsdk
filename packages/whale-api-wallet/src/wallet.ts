import { WalletAccount, WalletAccountProvider, WalletEllipticPair } from '@defichain/jellyfish-wallet'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { Network } from '@defichain/jellyfish-network'
import { P2WPKHTransactionBuilder } from '@defichain/jellyfish-transaction-builder/dist'
import { WhaleFeeRateProvider } from './feerate'
import { WhalePrevoutProvider } from './prevout'

export class WhaleWalletAccount extends WalletAccount {
  protected readonly feeRateProvider: WhaleFeeRateProvider
  protected readonly prevoutProvider: WhalePrevoutProvider

  constructor (
    public readonly client: WhaleApiClient,
    walletEllipticPair: WalletEllipticPair,
    network: Network,
    prevoutSize: number = 200
  ) {
    super(walletEllipticPair, network)
    this.feeRateProvider = new WhaleFeeRateProvider(client)
    this.prevoutProvider = new WhalePrevoutProvider(this, prevoutSize)
  }

  async isActive (): Promise<boolean> {
    const address = await this.getAddress()
    const agg = await this.client.address.getAggregation(address)
    return agg !== undefined
  }

  withTransactionBuilder (): P2WPKHTransactionBuilder {
    return new P2WPKHTransactionBuilder(this.feeRateProvider, this.prevoutProvider, {
      get: (_) => this
    }, this.network)
  }
}

export class WhaleWalletAccountProvider implements WalletAccountProvider<WhaleWalletAccount> {
  constructor (
    protected readonly client: WhaleApiClient,
    protected readonly network: Network
  ) {
  }

  provide (walletEllipticPair: WalletEllipticPair): WhaleWalletAccount {
    return new WhaleWalletAccount(this.client, walletEllipticPair, this.network)
  }
}
