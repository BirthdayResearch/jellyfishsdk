import createHmac from 'create-hmac'
import { pointCompress } from 'tiny-secp256k1'
import * as bip32 from 'bip32'
import { WalletHdNode, WalletHdNodeProvider } from '@defichain/jellyfish-wallet'
import { DERSignature } from '@defichain/jellyfish-crypto'
import { SIGHASH, Transaction, TransactionSegWit, Vout } from '@defichain/jellyfish-transaction'
import { TransactionSigner } from '@defichain/jellyfish-transaction-signature'
import { generateMnemonicWords, mnemonicToSeed, validateMnemonicSentence } from './mnemonic'

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
 * MnemonicHdNode implements the WalletHdNode from jellyfish-wallet.
 * MnemonicHdNode implementations is purpose and derivation agnostic.
 *
 * Prior-art:
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
   * @return Promise<Buffer> uncompressed public key
   */
  async publicKeyUncompressed (): Promise<Buffer> {
    const publicKey = await this.publicKey()
    return Buffer.from(pointCompress(publicKey, false))
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
   * @param {boolean} [validate=false] optionally validate mnemonic words. While BIP39 standard doesn't enforce
   * validation of words to generate the HD seed, this implementation optionally allow you to validate the BIP39 word
   * list before generating the MnemonicProviderData.
   * @throws {Error} if mnemonic sentence checksum invalid, if validate=true
   */
  static fromWords (words: string[], options: Bip32Options, validate: boolean = false): MnemonicHdNodeProvider {
    const data = this.wordsToData(words, options, validate)
    return this.fromData(data, options)
  }

  /**
   * @param {string[]} words to convert into MnemonicProviderData
   * @param {Bip32Options} options
   * @param {boolean} [validate=false] optionally validate mnemonic words. While BIP39 standard doesn't enforce
   * validation of words to generate the HD seed, this implementation optionally allow you to validate the BIP39 word
   * list before generating the MnemonicProviderData.
   * @return MnemonicProviderData
   * @throws {Error} if mnemonic sentence checksum invalid, if validate=true
   */
  static wordsToData (words: string[], options: Bip32Options, validate: boolean = false): MnemonicProviderData {
    if (validate && !validateMnemonicSentence(words)) {
      throw new Error('mnemonic sentence checksum invalid')
    }

    const node: bip32.BIP32Interface = fromWordsToSeed(words, options)
    return {
      words: words,
      chainCode: node.chainCode.toString('hex'),
      privKey: (node.privateKey as Buffer).toString('hex')
    }
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

/**
 * Derive from mnemonic words using our own seed called '@defichain/jellyfish-wallet-mnemonic'.
 *
 * @param {string[]} words to convert into Bip32Interface
 * @param {Bip32Options} options
 */
function fromWordsToSeed (words: string[], options: Bip32Options): bip32.BIP32Interface {
  const seed = mnemonicToSeed(words)
  if (seed.length < 16) {
    throw new TypeError('Seed should be at least 128 bits')
  }
  if (seed.length > 64) {
    throw new TypeError('Seed should be at most 512 bits')
  }

  const key = Buffer.from('@defichain/jellyfish-wallet-mnemonic', 'utf8')
  const I = createHmac('sha512', key).update(seed).digest()
  const IL = I.slice(0, 32)
  const IR = I.slice(32)

  return bip32.fromPrivateKey(IL, IR, options)
}
