import { WalletHdNode, WalletHdNodeProvider } from '@defichain/jellyfish-wallet'
import { DERSignature } from '@defichain/jellyfish-crypto'
import {
  Transaction,
  Vout,
  TransactionSegWit,
  TransactionSigner,
  SignInputOption, SIGHASH
} from '@defichain/jellyfish-transaction'
import bip32, { BIP32Interface } from 'bip32'
import bip39 from 'bip39'

/**
 * Bip32 Options, version bytes and WIF format. Unique to each chain.
 *
 * @see https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki#serialization-format
 */
export interface Bip32Options {
  bip32: {
    // base58Prefixes.EXT_PUBLIC_KEY
    public: number
    // base58Prefixes.EXT_SECRET_KEY
    private: number
  }
  // base58Prefixes.SECRET_KEY
  wif: number
}

/**
 * @param mnemonic sentence to validate
 */
export function validateMnemonic (mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic)
}

/**
 * Generate a random mnemonic code of length, uses crypto.randomBytes under the hood.
 * Defaults to 256-bits of entropy.
 * https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki
 *
 * |  ENT  | CS | ENT+CS |  MS  |
 * +-------+----+--------+------+
 * |  128  |  4 |   132  |  12  |
 * |  160  |  5 |   165  |  15  |
 * |  192  |  6 |   198  |  18  |
 * |  224  |  7 |   231  |  21  |
 * |  256  |  8 |   264  |  24  |
 *
 * @param length the sentence length of the mnemonic code
 */
export function generateMnemonic (length: 12 | 15 | 18 | 21 | 24 = 24): string {
  return bip39.generateMnemonic(length)
}

/**
 * MnemonicHdNode implements the WalletHdNode from jellyfish-wallet; a CoinType-agnostic HD Wallet for non custodial DeFi.
 * Purpose [44'] / CoinType-agnostic [n] / Account [n] / Chain (ignored for now) [0] / Addresses [n]
 *
 * - BIP32 Hierarchical Deterministic Wallets
 * - BIP39 Mnemonic code for generating deterministic keys
 * - BIP44 Multi-Account Hierarchy for Deterministic Wallets
 */
export class MnemonicHdNode implements WalletHdNode {
  private readonly root: BIP32Interface
  private readonly path: string

  constructor (root: BIP32Interface, path: string) {
    this.root = root
    this.path = path
  }

  /**
   * @private derive current code BIP32Interface, internal
   */
  private derive (): BIP32Interface {
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
    const inputs: SignInputOption[] = prevouts.map(prevout => {
      return { prevout: prevout, ellipticPair: this }
    })
    return TransactionSigner.sign(transaction, inputs, {
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
  /**
   * @param mnemonic code of the hd node
   * @param options for chain agnostic generation of public/private keys
   */
  static fromMnemonic (mnemonic: string, options: Bip32Options): MnemonicHdNodeProvider {
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    return this.fromSeed(seed, options)
  }

  /**
   * @param seed of the hd node
   * @param options for chain agnostic generation of public/private keys
   */
  static fromSeed (seed: Buffer, options: Bip32Options): MnemonicHdNodeProvider {
    const node = bip32.fromSeed(seed, options)
    return new MnemonicHdNodeProvider(node)
  }

  private readonly root: BIP32Interface

  private constructor (root: BIP32Interface) {
    this.root = root
  }

  async drive (path: string): Promise<MnemonicHdNode> {
    return new MnemonicHdNode(this.root, path)
  }
}
