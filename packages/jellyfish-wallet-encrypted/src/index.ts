import { MnemonicHdNode, Bip32Options } from '@defichain/jellyfish-wallet-mnemonic'
import { ScryptStorage } from './scrypt-storage'
import secp256k1 from 'tiny-secp256k1'
import * as bip32 from 'bip32'
import { Transaction, TransactionSegWit, Vout } from '@defichain/jellyfish-transaction/dist'
import { DERSignature, dSHA256 } from '@defichain/jellyfish-crypto'

export * from './scryptsy'
export * from './scrypt-storage'

export class EncryptedMnemonicHdNode {
  constructor (
    private readonly pubKey: Buffer,
    private readonly options: Bip32Options,
    private readonly path: string,
    private readonly scryptStorage: ScryptStorage
  ) {
    this.pubKey = pubKey
    this.options = options
    this.path = path
    this.scryptStorage = scryptStorage
  }

  /**
   * @returns {Promise<Buffer>} 33 bytes public key
   */
  async publicKey (): Promise<Buffer> {
    return this.pubKey
  }

  /**
   * To verify signature using public key from `this.publicKey()`
   * @param {Buffer} hash original signed message of the `derSignature`
   * @param {Buffer} derSignature result of a `WalletHdNode.sign()`
   * @returns {Promise<boolean>} is signature valid
   */
  async verify (hash: Buffer, derSignature: Buffer): Promise<boolean> {
    const signature = DERSignature.decode(derSignature)
    // using lower logic, bip.Bip32Interface instantiation is very expensive (decrypt seed)
    return secp256k1.verify(hash, this.pubKey, signature)
  }

  /**
   * @private To unlock raw mnemonic seed and recover bip32interface
   * @param {string} passphrase to unlock this.scryptStorage
   * @returns {Promise<bip32.BIP32Interface>}
   */
  private async _unlock (passphrase: string): Promise<bip32.BIP32Interface> {
    const seed = await this.scryptStorage.decrypt(passphrase)
    if (seed === null) {
      throw new Error('No encrypted seed found in storage')
    }
    return bip32.fromSeed(seed, this.options)
  }

  /**
   * To unlock raw mnemonic seed -> bip32interface, and return an instance of `MnemonicHdNode`
   * @warning unlocked MnemonicHdNode contain private key of your wallet, use this with caution
   * instance of `MnemonicHdNode` should be dumped as soon as not need, only use this if you know what are you doing
   *
   * @param {string} passphrase to unlock this.scryptStorage
   * @returns {Promise<MnemonicHdNode>}
   */
  async unlock (passphrase: string): Promise<MnemonicHdNode> {
    return new MnemonicHdNode(await this._unlock(passphrase), this.path)
  }

  /**
   * Unlock mnemonic hd node and retrieve private key, use with caution
   * @see unlock()
   * @param {string} passphrase to unlock seed -> bip32interface -> private key
   * @returns {Buffer} 32 bytes private key
   */
  async privateKey (passphrase: string): Promise<Buffer> {
    return await (await this.unlock(passphrase)).privateKey()
  }

  /**
   * To unlock private key and sign a message, @see MnemonicHdNode.sign()
   * @param {string} passphrase to unlock seed -> bip32interface -> private key for signing purpose
   * @param {Buffer} hash message to sign
   * @returns {Buffer} signature
   */
  async sign (passphrase: string, hash: Buffer): Promise<Buffer> {
    const unlocked = (await this.unlock(passphrase))
    return await unlocked.sign(hash)
  }

  /**
   * To unlock private key and sign a `Transaction`, @see MnemonicHdNode.signTx()
   * @param {string} passphrase to unlock seed -> bip32interface -> private key for signing purpose
   * @param {Transaction} transaction a DeFiChain transaction
   * @param {Vout[]} prevouts
   * @returns {TransactionSegWit} signed transaction
   */
  async signTx (passphrase: string, transaction: Transaction, prevouts: Vout[]): Promise<TransactionSegWit> {
    return await (await this.unlock(passphrase)).signTx(transaction, prevouts)
  }
}

export interface LoadEncryptedMnemonicOptions {
  passphrase: string
  scryptStorage: ScryptStorage
  options: Bip32Options
}

export interface CreateEncryptedMnemonicOptions extends LoadEncryptedMnemonicOptions {
  seed: Buffer
}

export class EncryptedMnemonicProvider {
  /**
   * @param {ScryptStorage} scryptStorage to store encrypted mnemonic seed
   * @param {Bip32Options} prefixOptions to reconstruct Bip32Interface when hdnode unlocked with passphrase
   * @param {Buffer} seedHash to verify new node derivation is using a valid seed
   */
  private constructor (
    private readonly scryptStorage: ScryptStorage,
    private readonly options: Bip32Options,
    private readonly seedHash: Buffer
  ) {
    this.scryptStorage = scryptStorage
    this.options = options
    this.seedHash = seedHash
  }

  /**
   * To create a provider which able to derive { @see EncryptedMnemonicHdNode } which has similar function as MnemonicHdNode
   *
   * @param {CreateEncryptedMnemonicOptions} encryptedMnemonicOptions
   * @param {ScryptStorage} encryptedMnemonicOptions.scryptStorage to store encrypted mnemonic seed
   * @param {string} encryptedMnemonicOptions.passphrase utf8 string in normalization format C
   * @param {Buffer} encryptedMnemonicOptions.seed to derive Bip32Interface
   * @param {Bip32Options} encryptedMnemonicOptions.options to derive Bip32Interface
   * @returns {EncryptedMnemonicProvider}
   */
  static async create (encryptedMnemonicOptions: CreateEncryptedMnemonicOptions): Promise<EncryptedMnemonicProvider> {
    const { seed, passphrase, scryptStorage, options } = encryptedMnemonicOptions
    await scryptStorage.encrypt(seed, passphrase)
    const seedHash = dSHA256(seed).slice(0, 4)
    return new EncryptedMnemonicProvider(scryptStorage, options, seedHash)
  }

  static async load (encryptedMnemonicOptions: LoadEncryptedMnemonicOptions): Promise<EncryptedMnemonicProvider> {
    const { passphrase, scryptStorage, options } = encryptedMnemonicOptions
    const seed = await scryptStorage.decrypt(passphrase)
    if (seed === null) {
      throw new Error('No seed found in storage')
    }
    const seedHash = dSHA256(seed).slice(0, 4)
    return new EncryptedMnemonicProvider(scryptStorage, options, seedHash)
  }

  /**
   * @param {string} path Bip32Interface derivation path @example "44'/1129'/0'/0/0"
   * @param {Buffer} seed the root seed, @see unlockAndDerive to derive by retrieving seed from encrypted storage
   * @returns {EncryptedMnemonicHdNode}
   */
  async deriveWithSeed (path: string, seed: Buffer): Promise<EncryptedMnemonicHdNode> {
    const root = bip32.fromSeed(seed)
    const seedHash = dSHA256(seed).slice(0, 4)
    if (Buffer.compare(seedHash, this.seedHash) !== 0) {
      throw new Error('InvalidSeedHash')
    }
    return new EncryptedMnemonicHdNode(
      root.derivePath(path).publicKey,
      this.options,
      path,
      this.scryptStorage
    )
  }

  /**
   * To unlock (retrieve seed) and derive an `EncryptedMnemonicHdNode`
   * @param {string} path Bip32Interface derivation path @example "44'/1129'/0'/0/0"
   * @param {string} passphrase to unlock seed
   * @returns {EncryptedMnemonicHdNode}
   */
  async unlockAndDerive (path: string, passphrase: string): Promise<EncryptedMnemonicHdNode> {
    const seed = await this.scryptStorage.decrypt(passphrase)
    if (seed === null) {
      throw new Error('No encrypted seed found in storage')
    }
    return await this.deriveWithSeed(path, seed)
  }
}
