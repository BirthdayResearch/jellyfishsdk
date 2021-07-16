import { dSHA256 } from '@defichain/jellyfish-crypto'
import { Bip32Options, MnemonicHdNode } from '@defichain/jellyfish-wallet-mnemonic'
import { ScryptStorage } from './scrypt-storage'
import * as bip32 from 'bip32'
import { Transaction, Vout, TransactionSegWit } from '@defichain/jellyfish-transaction'
import { WalletHdNode, WalletHdNodeProvider } from '@defichain/jellyfish-wallet'

export * from './scryptsy'
export * from './scrypt-storage'

export class EncryptedMnemonicHdNode implements WalletHdNode {
  constructor (
    private readonly options: Bip32Options,
    private readonly path: string,
    private readonly scryptStorage: ScryptStorage
  ) {}

  /**
   * @throws always throw error, this is encrypted
   */
  async publicKey (): Promise<Buffer> {
    throw new Error('Encrypted')
  }

  /**
   * @throws always throw error, this is encrypted
   */
  async verify (hash: Buffer, derSignature: Buffer): Promise<boolean> {
    throw new Error('Encrypted')
  }

  /**
   * @throws always throw error, this is encrypted
   */
  async privateKey (): Promise<Buffer> {
    throw new Error('Encrypted')
  }

  /**
   * @throws always throw error, this is encrypted
   */
  async sign (hash: Buffer): Promise<Buffer> {
    throw new Error('Encrypted')
  }

  /**
   * @throws always throw error, this is encrypted
   */
  async signTx (transaction: Transaction, prevouts: Vout[]): Promise<TransactionSegWit> {
    throw new Error('Encrypted')
  }

  /**
   * @private To unlock raw mnemonic seed and recover bip32interface
   * @param {string} passphrase to unlock this.scryptStorage
   * @returns {Promise<bip32.BIP32Interface>}
   */
  private async _decryptSeed (passphrase: string): Promise<bip32.BIP32Interface> {
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
  private async _getHdNode (passphrase: string): Promise<MnemonicHdNode> {
    return new MnemonicHdNode(await this._decryptSeed(passphrase), this.path)
  }

  /**
   * @returns {Promise<Buffer>} 33 bytes public key
   */
  async unlockPublicKey (passphrase: string): Promise<Buffer> {
    return await (await this._getHdNode(passphrase)).publicKey()
  }

  /**
   * To verify signature using public key from `this.publicKey()`
   * @param {Buffer} hash original signed message of the `derSignature`
   * @param {Buffer} derSignature result of a `WalletHdNode.sign()`
   * @returns {Promise<boolean>} is signature valid
   */
  async unlockAndVerify (passphrase: string, hash: Buffer, derSignature: Buffer): Promise<boolean> {
    return await (await this._getHdNode(passphrase)).verify(hash, derSignature)
  }

  /**
   * Unlock mnemonic hd node and retrieve private key, use with caution
   * @see unlock()
   * @param {string} passphrase to unlock seed -> bip32interface -> private key
   * @returns {Buffer} 32 bytes private key
   */
  async unlockPrivateKey (passphrase: string): Promise<Buffer> {
    return await (await this._getHdNode(passphrase)).privateKey()
  }

  /**
   * To unlock private key and sign a message, @see MnemonicHdNode.sign()
   * @param {string} passphrase to unlock seed -> bip32interface -> private key for signing purpose
   * @param {Buffer} hash message to sign
   * @returns {Buffer} signature
   */
  async unlockAndSign (passphrase: string, hash: Buffer): Promise<Buffer> {
    return await (await this._getHdNode(passphrase)).sign(hash)
  }

  /**
   * To unlock private key and sign a `Transaction`, @see MnemonicHdNode.signTx()
   * @param {string} passphrase to unlock seed -> bip32interface -> private key for signing purpose
   * @param {Transaction} transaction a DeFiChain transaction
   * @param {Vout[]} prevouts
   * @returns {TransactionSegWit} signed transaction
   */
  async unlockAndSignTx (passphrase: string, transaction: Transaction, prevouts: Vout[]): Promise<TransactionSegWit> {
    return await (await this._getHdNode(passphrase)).signTx(transaction, prevouts)
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

export class EncryptedMnemonicProvider implements WalletHdNodeProvider<EncryptedMnemonicHdNode> {
  /**
   * @param {ScryptStorage} scryptStorage to store encrypted mnemonic seed
   * @param {Bip32Options} prefixOptions to reconstruct Bip32Interface when hdnode unlocked with passphrase
   * @param {Buffer} seedHash to verify new node derivation is using a valid seed
   */
  private constructor (
    private readonly scryptStorage: ScryptStorage,
    private readonly options: Bip32Options,
    private readonly seedHash: Buffer
  ) {}

  /**
   * To create a new provider which able to derive { @see EncryptedMnemonicHdNode } which has similar function as MnemonicHdNode
   * with new passphrase
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

  /**
   * To instantiate an EncryptedMnemonicProvider from existing storage
   * valid encryptedMnemonicOptions.passphrase expected to descrypt scrypted data successfully
   *
   * @param encryptedMnemonicOptions
   * @returns {EncryptedMnemonicProvider}
   */
  static async load (encryptedMnemonicOptions: LoadEncryptedMnemonicOptions): Promise<EncryptedMnemonicProvider> {
    const { passphrase, scryptStorage, options } = encryptedMnemonicOptions
    const seed = await scryptStorage.decrypt(passphrase)
    if (seed === null) {
      throw new Error('No seed found in storage')
    }
    const seedHash = dSHA256(seed).slice(0, 4)
    return new EncryptedMnemonicProvider(scryptStorage, options, seedHash)
  }

  derive (path: string): EncryptedMnemonicHdNode {
    return new EncryptedMnemonicHdNode(
      this.options,
      path,
      this.scryptStorage
    )
  }
}
