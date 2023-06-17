import { SIGHASH, Transaction, TransactionSegWit, Vout } from '@defichain/jellyfish-transaction'
import { WalletHdNode, WalletHdNodeProvider } from '@defichain/jellyfish-wallet'
import Transport from '@ledgerhq/hw-transport'
import AppBtc from '@ledgerhq/hw-app-btc'
import { DERSignature } from '@defichain/jellyfish-crypto'
import ecc from 'tiny-secp256k1'
import { TransactionSigner } from '@defichain/jellyfish-transaction-signature'

/**
 * LedgerHdNode implements the WalletHdNode for ledger hardware device for jellyfish-wallet; a CoinType-agnostic HD Wallet for noncustodial DeFi.
 * Purpose [44'] / CoinType-agnostic [n] / Account [n] / Chain (ignored for now) [0] / Addresses [n]
 *
 * - BIP32 Hierarchical Deterministic Wallets
 * - BIP44 Multi-Account Hierarchy for Deterministic Wallets
 */
export class LedgerHdNode implements WalletHdNode {
  private readonly transport: Transport
  private readonly path: string
  private readonly btcApp: AppBtc
  private pubKeyCompressed: Buffer | undefined // cache the public key so that we don't have to request for user auth multiple times

  constructor (transport: Transport, path: string) {
    this.transport = transport
    this.path = path
    this.btcApp = new AppBtc(this.transport)
  }

  /**
   * Returns the public key.
   *
   * @return {Promise<Buffer>} Object including the public key in compressed format
   */
  async publicKey (verify: boolean = false): Promise<Buffer> {
    if (this.pubKeyCompressed === undefined) {
      const result = await this.btcApp.getWalletPublicKey(this.path, { verify: verify, format: 'legacy' })
      this.pubKeyCompressed = ecc.pointCompress(Buffer.from(result.publicKey, 'hex'), true)
      return this.pubKeyCompressed
    } else {
      return this.pubKeyCompressed
    }
  }

  // NOTE(surangap): private key do not leave the hardware device
  async privateKey (): Promise<Buffer> {
    throw new Error('private key do not leave the ledger')
  }

  /**
   * Signs the message with the private key.
   * The data to sign will be the "\x15Defi Signed Message:\n"<length of the message in 1 byte><message>
   *
   * @param {Buffer} message message to sign
   * @return {Promise<Buffer>} Object including the signature in DER format
   */
  async sign (message: Buffer): Promise<Buffer> {
    const result = await this.btcApp.signMessageNew(this.path, message.toString('hex'))
    const signature = Buffer.concat([Buffer.from(result.r, 'hex'), Buffer.from(result.s, 'hex')])
    return DERSignature.encode(signature)
  }

  /**
   * Verifies the given signature with the hash.
   *
   * @param {Buffer} hash hash of the signed message
   * @param {Buffer} derSignature signature in DER format
   * @return {Promise<boolean>} Object including the verification result
   */
  async verify (hash: Buffer, derSignature: Buffer): Promise<boolean> {
    const signature = DERSignature.decode(derSignature)
    return ecc.verify(hash, await this.publicKey(), signature)
  }

  /**
   * Sign a transaction with all prevout belong to this HdNode with SIGHASH.ALL
   * This implementation can only sign a P2WPKH, hence the implementing WalletAccount should only
   * recognize P2WPKH addresses encoded in bech32 format.
   *
   * @param {Transaction} transaction to sign
   * @param {Vout[]} prevouts of transaction to sign, ellipticPair will be mapped to current node
   * @return TransactionSegWit signed transaction ready to broadcast
   */
  async signTx (transaction: Transaction, prevouts: Vout[]): Promise<TransactionSegWit> {
    return await TransactionSigner.signPrevoutsWithEllipticPairs(transaction, prevouts, prevouts.map(() => this), {
      sigHashType: SIGHASH.ALL
    })
  }
}

/**
 * Provider that derive LedgerHdNode from the path.
 */
export class LedgerHdNodeProvider implements WalletHdNodeProvider<LedgerHdNode> {
  private readonly transport: Transport

  private constructor (transport: Transport) {
    this.transport = transport
  }

  /**
   * @param {Transport} transport Transport to connect to the ledger hardware device
   * @return {LedgerHdNodeProvider} LedgerHdNodeProvider
   */
  static getProvider (transport: Transport): LedgerHdNodeProvider {
    return new LedgerHdNodeProvider(transport)
  }

  /**
   * @param {string} path bip32 path
   * @return {LedgerHdNode} LedgerHdNode for the relavant path
   */
  derive (path: string): LedgerHdNode {
    return new LedgerHdNode(this.transport, path)
  }
}
