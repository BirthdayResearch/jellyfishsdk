import { MnemonicHdNode, Bip32Options } from '@defichain/jellyfish-wallet-mnemonic'
import { ScryptStorage } from './scrypt-storage'
import * as bip32 from 'bip32'
import { SIGHASH, SignInputOption, Transaction, TransactionSegWit, TransactionSigner, Vout } from '@defichain/jellyfish-transaction/dist'
import { dSHA256 } from '@defichain/jellyfish-crypto'

export * from './scryptsy'
export * from './scrypt-storage'

export class EncryptedMnemonicHdNode {
  private readonly path: string
  private readonly options: Bip32Options
  private readonly scryptStorage: ScryptStorage

  private readonly pubKey: Buffer
  private readonly bip32Verify: (hash: Buffer, signature: Buffer) => boolean

  constructor (root: bip32.BIP32Interface, options: Bip32Options, path: string, scryptStorage: ScryptStorage) {
    this.path = path
    this.scryptStorage = scryptStorage
    this.options = options
    this.pubKey = root.publicKey
    this.bip32Verify = root.verify.bind(this)
  }

  async publicKey (): Promise<Buffer> {
    return this.pubKey
  }

  async verify (hash: Buffer, derSignature: Buffer): Promise<boolean> {
    return this.bip32Verify(hash, derSignature)
  }

  private async _unlock (passphrase: string): Promise<bip32.BIP32Interface> {
    const seed = await this.scryptStorage.decrypt(passphrase)
    if (seed === null) {
      throw new Error('No encrypted seed found in storage')
    }
    return bip32.fromSeed(seed, this.options)
  }

  async unlock (passphrase: string): Promise<MnemonicHdNode> {
    return new MnemonicHdNode(await this._unlock(passphrase), this.path)
  }

  async privateKey (passphrase: string): Promise<Buffer> {
    const privKey = (await this._unlock(passphrase)).privateKey
    if (privKey != null) {
      return privKey
    }
    throw new Error('neutered hd node')
  }

  async sign (passphrase: string, hash: Buffer): Promise<Buffer> {
    return (await this._unlock(passphrase)).sign(hash)
  }

  async signTx (passphrase: string, transaction: Transaction, prevouts: Vout[]): Promise<TransactionSegWit> {
    const unlockedNode = new MnemonicHdNode(await this._unlock(passphrase), this.path)
    const inputs: SignInputOption[] = prevouts.map(prevout => {
      return { prevout: prevout, ellipticPair: unlockedNode }
    })
    return TransactionSigner.sign(transaction, inputs, {
      sigHashType: SIGHASH.ALL
    })
  }
}
export interface EncryptedMnemonicOptions {
  scryptStorage: ScryptStorage
  seed: Buffer
  passphrase: string
  options: Bip32Options
}

export class EncryptedMnemonicProvider {
  private readonly scryptStorage: ScryptStorage
  private readonly options: Bip32Options
  private readonly seedHash: Buffer

  /**
   * @param {Buffer} seed of the hd node
   * @param {Bip32Options} options for chain agnostic generation of public/private keys
   */
  private constructor (scryptStorage: ScryptStorage, options: Bip32Options, seedHash: Buffer) {
    this.scryptStorage = scryptStorage
    this.options = options
    this.seedHash = seedHash
  }

  static async create (encryptedMnemonicOptions: EncryptedMnemonicOptions): Promise<EncryptedMnemonicProvider> {
    const { seed, passphrase, scryptStorage, options } = encryptedMnemonicOptions
    await scryptStorage.encrypt(seed, passphrase)
    const hash = dSHA256(seed).slice(0, 4)
    return new EncryptedMnemonicProvider(scryptStorage, options, hash)
  }

  async deriveWithSeed (path: string, seed: Buffer): Promise<EncryptedMnemonicHdNode> {
    const root = bip32.fromSeed(seed)
    const hash = dSHA256(seed).slice(0, 4)
    if (this.seedHash !== hash) {
      throw new Error('Invalid seed hash')
    }
    return new EncryptedMnemonicHdNode(root, this.options, path, this.scryptStorage)
  }

  async unlockAndDerive (path: string, passphrase: string): Promise<EncryptedMnemonicHdNode> {
    const seed = await this.scryptStorage.decrypt(passphrase)
    if (seed === null) {
      throw new Error('No encrypted seed found in storage')
    }
    return await this.deriveWithSeed(path, seed)
  }
}
