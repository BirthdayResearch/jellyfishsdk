import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubService } from 'packages/whale-api-client/__tests__/stub.service'
import { WhaleWalletAccount, WhaleWalletAccountProvider } from '../src/wallet'
import {
  WalletAccount,
  WalletAccountProvider,
  WalletEllipticPair,
  WalletHdNode, WalletHdNodeProvider
} from '@defichain/jellyfish-wallet'
import { Network, RegTest } from '@defichain/jellyfish-network'
import { Elliptic, EllipticPair } from '@defichain/jellyfish-crypto'
import { SIGHASH, Transaction, TransactionSegWit, Vout } from '@defichain/jellyfish-transaction'
import { TransactionSigner } from '@defichain/jellyfish-transaction-signature'
import { StubWhaleApiClient } from '@defichain/whale-api-client/__tests__/stub.client'

export class TestNode implements WalletHdNode {
  public readonly path: string
  public readonly ellipticPair: EllipticPair

  constructor (path: string) {
    this.path = path
    this.ellipticPair = Elliptic.fromPrivKey(
      Buffer.alloc(32, path, 'ascii')
    )
  }

  async publicKey (): Promise<Buffer> {
    return await this.ellipticPair.publicKey()
  }

  async privateKey (): Promise<Buffer> {
    return await this.ellipticPair.privateKey()
  }

  async sign (hash: Buffer): Promise<Buffer> {
    return await this.ellipticPair.sign(hash)
  }

  async verify (hash: Buffer, derSignature: Buffer): Promise<boolean> {
    return await this.ellipticPair.verify(hash, derSignature)
  }

  async signTx (transaction: Transaction, prevouts: Vout[]): Promise<TransactionSegWit> {
    return await TransactionSigner.signPrevoutsWithEllipticPairs(transaction, prevouts, prevouts.map(() => this), {
      sigHashType: SIGHASH.ALL
    })
  }
}

export class TestNodeProvider implements WalletHdNodeProvider<TestNode> {
  derive (path: string): TestNode {
    return new TestNode(path)
  }
}
export class TestAccount extends WalletAccount {
  constructor (hdNode: WalletEllipticPair, readonly provider: TestAccountProvider) {
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

  provide (hdNode: WalletEllipticPair): TestAccount {
    return new TestAccount(hdNode, this)
  }
}

let container: MasterNodeRegTestContainer
let service: StubService
let client: StubWhaleApiClient
let account: WhaleWalletAccount
let wallet: WalletAccount

beforeAll(async () => {
  container = new MasterNodeRegTestContainer()
  service = new StubService(container)
  const nodeProvider = new TestNodeProvider()
  const accountProvider = new TestAccountProvider([])
  console.log(nodeProvider, accountProvider)
  client = new StubWhaleApiClient(service)
  account = new WhaleWalletAccountProvider(client, RegTest).provide(wallet) // <-- Not sure if this is the way
  console.log(account)
  // whalePrevoutProvider = WhalePrevoutProvider(account, 5)

  await container.start()
  await service.start()
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})
