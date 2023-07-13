import { WalletHdNode, WalletHdNodeProvider } from '../src'
import { SIGHASH, Transaction, TransactionSegWit, Vout } from '@defichain/jellyfish-transaction'
import { TransactionSigner } from '@defichain/jellyfish-transaction-signature'
import { Elliptic, EllipticPair } from '@defichain/jellyfish-crypto'

/**
 * This is for testing only, please don't use this for anything else.
 */
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

  async publicKeyUncompressed (): Promise<Buffer> {
    return await this.ellipticPair.publicKeyUncompressed()
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
