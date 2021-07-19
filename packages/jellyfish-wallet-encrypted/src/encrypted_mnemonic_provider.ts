import { Bip32Options, MnemonicHdNode } from '@defichain/jellyfish-wallet-mnemonic'
import { ScryptStorage } from './scrypt_storage'
import * as bip32 from 'bip32'
import { Transaction, Vout, TransactionSegWit } from '@defichain/jellyfish-transaction'
import { WalletHdNode, WalletHdNodeProvider } from '@defichain/jellyfish-wallet'
import { EncryptedBip32Provider } from './bip32-provider'

export type CollectPassphrase = () => Promise<string>
export interface Bip32Provider {
  get: () => Promise<bip32.BIP32Interface>
}

/**
 * Extended implementation of @see {@link MnemonicHdNode} without Bip32Interface pulled on demand
 */
export class OnDemandMnemonicHdNode implements WalletHdNode {
  constructor (
    private readonly bip32Provider: Bip32Provider,
    private readonly path: string
  ) {}

  /**
   * Demanding/Instantiate MnemonicHdNode
   * @returns {Promise<MnemonicHdNode>}
   */
  private async _getHdNode (): Promise<MnemonicHdNode> {
    return new MnemonicHdNode(await this.bip32Provider.get(), this.path)
  }

  /**
   * Extended implementation of {@link MnemonicHdNode.verify}
   * Pulling passphrase from provided `CollectPassphrase` interface as part of promise
   *
   * @return {Promise<Buffer>}
   */
  async publicKey (): Promise<Buffer> {
    return await (await this._getHdNode()).publicKey()
  }

  /**
   * Extended implementation of {@link MnemonicHdNode.verify}
   * Pulling passphrase from provided `CollectPassphrase` interface as part of promise
   *
   * @param {Buffer} hash to verify with signature
   * @param {Buffer} derSignature of the hash in encoded with DER, SIGHASHTYPE must not be included
   * @return {Promise<boolean>}
   */
  async verify (hash: Buffer, derSignature: Buffer): Promise<boolean> {
    return await (await this._getHdNode()).verify(hash, derSignature)
  }

  /**
   * Extended implementation of {@link MnemonicHdNode.privateKey}
   * Pulling passphrase from provided `CollectPassphrase` interface as part of promise
   *
   * @return {Promise<Buffer>}
   */
  async privateKey (): Promise<Buffer> {
    return await (await this._getHdNode()).privateKey()
  }

  /**
   * Extended implementation of {@link MnemonicHdNode.sign}
   * Pulling passphrase from provided `CollectPassphrase` interface as part of promise
   *
   * @param {Buffer} hash to sign
   * @return {Promise<Buffer>}
   */
  async sign (hash: Buffer): Promise<Buffer> {
    return await (await this._getHdNode()).sign(hash)
  }

  /**
   * Extended implementation of {@link MnemonicHdNode.signTx}
   * Pulling passphrase from provided `CollectPassphrase` interface as part of promise
   *
   * @param {Transaction} transaction to sign
   * @param {Vout[]} prevouts of transaction to sign, ellipticPair will be mapped to current node
   * @return {Promise<TransactionSegWit>}
   */
  async signTx (transaction: Transaction, prevouts: Vout[]): Promise<TransactionSegWit> {
    return await (await this._getHdNode()).signTx(transaction, prevouts)
  }
}

export interface LoadEncryptedMnemonicOptions {
  collectPassphrase: CollectPassphrase
  scryptStorage: ScryptStorage
  options: Bip32Options
}

export interface CreateEncryptedMnemonicOptions extends LoadEncryptedMnemonicOptions {
  seed: Buffer
}

export class EncryptedMnemonicProvider implements WalletHdNodeProvider<OnDemandMnemonicHdNode> {
  /**
   * @param {() => Promise<string>} collectPassphrasea n interface to request password from user
   * @param {ScryptStorage} scryptStorage secured storage of mnemonic seed (encrypted)
   * @param {Bip32Options} options to reconstruct Bip32Interface on demand after successfully unlocked seed
   */
  private constructor (
    private readonly collectPassphrase: () => Promise<string>,
    private readonly scryptStorage: ScryptStorage,
    private readonly options: Bip32Options
  ) {}

  /**
   * To create a new provider which able to derive { @see EncryptedMnemonicHdNode } which has similar function as MnemonicHdNode
   * with new passphrase
   *
   * @param {CreateEncryptedMnemonicOptions} encryptedMnemonicOptions
   * @param {ScryptStorage} encryptedMnemonicOptions.scryptStorage to store encrypted mnemonic seed
   * @param {() => Promise<string>} encryptedMnemonicOptions.collectPassphrase an interface to request password from user
   * @param {Buffer} encryptedMnemonicOptions.seed to derive Bip32Interface
   * @param {Bip32Options} encryptedMnemonicOptions.options to derive Bip32Interface
   * @returns {EncryptedMnemonicProvider}
   */
  static async create (encryptedMnemonicOptions: CreateEncryptedMnemonicOptions): Promise<EncryptedMnemonicProvider> {
    const { seed, collectPassphrase, scryptStorage, options } = encryptedMnemonicOptions
    await scryptStorage.encrypt(seed, await collectPassphrase())
    return new EncryptedMnemonicProvider(collectPassphrase, scryptStorage, options)
  }

  /**
   * To instantiate an EncryptedMnemonicProvider from existing storage
   * valid encryptedMnemonicOptions.passphrase expected to descrypt scrypted data successfully
   *
   * @param encryptedMnemonicOptions
   * @param {ScryptStorage} encryptedMnemonicOptions.scryptStorage to store encrypted mnemonic seed
   * @param {() => Promise<string>} encryptedMnemonicOptions.collectPassphrase an interface to request password from user
   * @param {Bip32Options} encryptedMnemonicOptions.options to derive Bip32Interface
   * @returns {EncryptedMnemonicProvider}
   * @throws Error InvalidPassphare if passphare invalid
   * @throws Error 'No seed found in storage' if no seed existed in provided ScryptStorage
   */
  static async load (encryptedMnemonicOptions: LoadEncryptedMnemonicOptions): Promise<EncryptedMnemonicProvider> {
    const { collectPassphrase, scryptStorage, options } = encryptedMnemonicOptions
    const passphrase = await collectPassphrase()
    const seed = await scryptStorage.decrypt(passphrase)
    if (seed === null) {
      throw new Error('No seed found in storage')
    }
    return new EncryptedMnemonicProvider(collectPassphrase, scryptStorage, options)
  }

  derive (path: string): OnDemandMnemonicHdNode {
    return new OnDemandMnemonicHdNode(
      new EncryptedBip32Provider(this.collectPassphrase, this.scryptStorage, this.options),
      path
    )
  }
}
