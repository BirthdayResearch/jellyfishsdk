import { WalletAccount, WalletAccountProvider, WalletHdNode } from '../src'
import { Network, RegTest } from '@defichain/jellyfish-network'

/**
 * This is for testing only, please don't use this for anything else.
 * Address is the pubkey
 *
 * The first 5 keys are:
 * 028b147a7939b8e510defb56a1fccb80d2557d1fa7b5023a704ad4cfcfc651af2f
 * 0337f21a6b2a6be26086ab0e7509fdb1316ef2a428b2571d1e20cb8886f6e2f9f1
 * 023bf78af6546c9d957d0fa0d3066f3d7fa735196662e2cce753305926712945d7
 * 02a9b7278229a9a4cb20a7852bf540559dc844faba558338d221cd0d26b795fdbb
 * 02acf1d65943ce391c5c7a6319050c71ece26f5815f1a69445edd35b8d8dac13be
 */
export class TestAccount extends WalletAccount {
  constructor (hdNode: WalletHdNode, readonly provider: TestAccountProvider) {
    super(hdNode, provider.network)
  }

  async isActive (): Promise<boolean> {
    const address = await this.getAddress()
    return this.provider.addresses.includes(address)
  }
}

export class TestAccountProvider implements WalletAccountProvider<TestAccount> {
  public network: Network = RegTest

  constructor (public readonly addresses: string[]) {
  }

  provide (hdNode: WalletHdNode): TestAccount {
    return new TestAccount(hdNode, this)
  }
}
