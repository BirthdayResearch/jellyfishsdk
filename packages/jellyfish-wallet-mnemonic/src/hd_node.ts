import { WalletHdNode, WalletHdNodeProvider } from '@defichain/jellyfish-wallet'
import { DERSignature } from '@defichain/jellyfish-crypto'
import { SIGHASH, Transaction, TransactionSegWit, Vout } from '@defichain/jellyfish-transaction'
import { TransactionSigner } from '@defichain/jellyfish-transaction-signature'
import * as bip32 from 'bip32'

/**
 * Bip32 Options, version bytes and WIF format. Unique to each chain.
 *
 * @see https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki#serialization-format
 */
export interface Bip32Options {
  bip32: {
    /* base58Prefixes.EXT_PUBLIC_KEY */
    public: number
    /* base58Prefixes.EXT_SECRET_KEY */
    private: number
  }
  /* base58Prefixes.SECRET_KEY */
  wif: number
}

/**
 * MnemonicHdNode implements the WalletHdNode from jellyfish-wallet; a CoinType-agnostic HD Wallet for noncustodial DeFi.
 * Purpose [44'] / CoinType-agnostic [n] / Account [n] / Chain (ignored for now) [0] / Addresses [n]
 *
 * - BIP32 Hierarchical Deterministic Wallets
 * - BIP39 Mnemonic code for generating deterministic keys
 * - BIP44 Multi-Account Hierarchy for Deterministic Wallets
 */
export class MnemonicHdNode implements WalletHdNode {
  constructor (
    private readonly root: bip32.BIP32Interface,
    private readonly path: string
  ) {
  }

  /**
   * @private derive current code BIP32Interface, internal
   */
  private derive (): bip32.BIP32Interface {
    return this.root.derivePath(this.path)
  }

  /**
   * @return Promise<Buffer> compressed public key
   */
  async publicKey (): Promise<Buffer> {
    return this.derive().publicKey
  }

  /**
   * @return Promise<Buffer> privateKey of the WalletHdNode, allowed to fail if neutered.
   */
  async privateKey (): Promise<Buffer> {
    const node = this.derive()

    if (node.privateKey != null) {
      return node.privateKey
    }

    throw new Error('neutered hd node')
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

  /**
   * @param {Buffer} hash to sign
   * @return {Buffer} signature in DER format, SIGHASHTYPE not included
   */
  async sign (hash: Buffer): Promise<Buffer> {
    const node = this.derive()
    const signature = node.sign(hash, true)
    return DERSignature.encode(signature)
  }

  /**
   * @param {Buffer} hash to verify with signature
   * @param {Buffer} derSignature of the hash in encoded with DER, SIGHASHTYPE must not be included
   * @return Promise<boolean> validity of signature of the hash
   */
  async verify (hash: Buffer, derSignature: Buffer): Promise<boolean> {
    const node = this.derive()
    const signature = DERSignature.decode(derSignature)
    return node.verify(hash, signature)
  }
}

/**
 * Provider that derive MnemonicHdNode from root. Uses a lite on demand derivation.
 */
export class MnemonicHdNodeProvider implements WalletHdNodeProvider<MnemonicHdNode> {
  private constructor (private readonly root: bip32.BIP32Interface) {
  }

  derive (path: string): MnemonicHdNode {
    return new MnemonicHdNode(this.root, path)
  }

  /**
   * @param {Buffer} seed of the hd node
   * @param {Bip32Options} options for chain agnostic generation of public/private keys
   */
  static fromSeed (seed: Buffer, options: Bip32Options): MnemonicHdNodeProvider {
    const root = bip32.fromSeed(seed, options)
    return new MnemonicHdNodeProvider(root)
  }

  /**
   * @param {Buffer} pubKey
   * @param {Buffer} chainCode the extended keys, identical for corresponding private and public keys, and consists of 32 bytes.
   * @param {Bip32Options} options for chain agnostic generation of public/private keys
   */
  static fromPubKey (pubKey: Buffer, chainCode: Buffer, options: Bip32Options): MnemonicHdNodeProvider {
    const root = bip32.fromPublicKey(pubKey, chainCode, options)
    return new MnemonicHdNodeProvider(root)
  }

  /**
   * @param {Buffer} privKey
   * @param {Buffer} chainCode the extended keys, identical for corresponding private and public keys, and consists of 32 bytes.
   * @param {Bip32Options} options for chain agnostic generation of public/private keys
   */
  static fromPrivKey (privKey: Buffer, chainCode: Buffer, options: Bip32Options): MnemonicHdNodeProvider {
    const root = bip32.fromPrivateKey(privKey, chainCode, options)
    return new MnemonicHdNodeProvider(root)
  }
}
