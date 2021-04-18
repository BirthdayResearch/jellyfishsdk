import { WalletAccount, WalletAccountProvider, WalletHdNode } from '../src'

/**
 * This is for testing only, please don't use this for anything else.
 */
export class TestAccount implements WalletAccount {
  public hdNode: WalletHdNode
  public provider: TestAccountProvider

  constructor (hdNode: WalletHdNode, provider: TestAccountProvider) {
    this.hdNode = hdNode
    this.provider = provider
  }

  async getAddress (): Promise<string> {
    const pubKey = await this.hdNode.publicKey()
    return pubKey.toString('hex')
  }

  async isActive (): Promise<boolean> {
    const address = await this.getAddress()
    return this.provider.mappings[address] !== undefined
  }
}

interface MockTestAccountData {
  utxo?: {
  }
  tokens?: {
  }
}

export class TestAccountProvider implements WalletAccountProvider<TestAccount> {
  public readonly mappings: {
    [pubKey: string]: MockTestAccountData
  }

  constructor (mappings: { [pubKey: string]: MockTestAccountData }) {
    this.mappings = mappings
  }

  provide (hdNode: WalletHdNode): TestAccount {
    return new TestAccount(hdNode, this)
  }
}
