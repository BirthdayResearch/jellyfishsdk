import * as bip32 from 'bip32'
import { WalletHdNode, WalletHdNodeProvider } from '@defichain/jellyfish-wallet'
import { DERSignature } from '@defichain/jellyfish-crypto'
import { SIGHASH, Transaction, TransactionSegWit, Vout } from '@defichain/jellyfish-transaction'
import { TransactionSigner } from '@defichain/jellyfish-transaction-signature'
import { generateMnemonicWords, mnemonicToSeed } from './mnemonic'

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
    public readonly path: string,
    protected readonly rootPrivKey: Buffer,
    protected readonly chainCode: Buffer,
    protected readonly options: Bip32Options
  ) {
  }

  protected async deriveNode (): Promise<bip32.BIP32Interface> {
    return bip32.fromPrivateKey(this.rootPrivKey, this.chainCode, this.options)
      .derivePath(this.path)
  }

  /**
   * @return Promise<Buffer> compressed public key
   */
  async publicKey (): Promise<Buffer> {
    const node = await this.deriveNode()
    return node.publicKey
  }

  /**
   * @return Promise<Buffer> privateKey of the WalletHdNode
   */
  async privateKey (): Promise<Buffer> {
    const node = await this.deriveNode()
    return node.privateKey as Buffer
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
    const node = await this.deriveNode()
    const signature = node.sign(hash, true)
    return DERSignature.encode(signature)
  }

  /**
   * @param {Buffer} hash to verify with signature
   * @param {Buffer} derSignature of the hash in encoded with DER, SIGHASHTYPE must not be included
   * @return Promise<boolean> validity of signature of the hash
   */
  async verify (hash: Buffer, derSignature: Buffer): Promise<boolean> {
    const node = await this.deriveNode()
    const signature = DERSignature.decode(derSignature)
    return node.verify(hash, signature)
  }
}

/**
 * MnemonicHdNodeProvider data encoded as hex.
 */
export interface MnemonicProviderData {
  words: string[]
  /* Encoded as string hex */
  privKey: string
  /* Encoded as string hex */
  chainCode: string
}

/**
 * Provider that derive MnemonicHdNode from root. Uses a lite on demand derivation.
 */
export class MnemonicHdNodeProvider implements WalletHdNodeProvider<MnemonicHdNode> {
  private constructor (
    private readonly data: MnemonicProviderData,
    private readonly options: Bip32Options
  ) {
  }

  derive (path: string): MnemonicHdNode {
    const rootPrivKey = Buffer.from(this.data.privKey, 'hex')
    const chainCode = Buffer.from(this.data.chainCode, 'hex')
    return new MnemonicHdNode(path, rootPrivKey, chainCode, this.options)
  }

  /**
   * @param {MnemonicProviderData} data to init MnemonicHdNodeProvider
   * @param {Bip32Options} options
   */
  static fromData (data: MnemonicProviderData, options: Bip32Options): MnemonicHdNodeProvider {
    return new MnemonicHdNodeProvider(data, options)
  }

  /**
   * @param {string[]} words to init MnemonicHdNodeProvider
   * @param {Bip32Options} options
   */
  static fromWords (words: string[], options: Bip32Options): MnemonicHdNodeProvider {
    const data = this.wordsToData(words, options)
    return this.fromData(data, options)
  }

  /**
   * @param {string[]} words to convert into MnemonicProviderData
   * @param {Bip32Options} options
   * @return MnemonicProviderData
   */
  static wordsToData (words: string[], options: Bip32Options): MnemonicProviderData {
    const seed = mnemonicToSeed(words)
    const node = bip32.fromSeed(seed, options)
    const privKey = (node.privateKey as Buffer).toString('hex')
    const chainCode = node.chainCode.toString('hex')
    return { words, chainCode, privKey }
  }

  /**
   * Generate a random mnemonic code of length, uses crypto.randomBytes under the hood.
   *
   * @param {number} length the sentence length of the mnemonic code
   * @param {(number) => Buffer} rng random number generation, generate random num of bytes buffer
   * @return {string[]} generated mnemonic word list, (COLD STORAGE)
   */
  static generateWords (length: 12 | 15 | 18 | 21 | 24 = 24, rng?: (numOfBytes: number) => Buffer): string[] {
    return generateMnemonicWords(length, rng)
  }
}
