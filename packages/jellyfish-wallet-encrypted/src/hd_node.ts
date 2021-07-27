import { WalletHdNodeProvider } from '@defichain/jellyfish-wallet'
import * as bip32 from 'bip32'
import { Bip32Options, MnemonicHdNode, MnemonicHdNodeProvider } from '@defichain/jellyfish-wallet-mnemonic'
import { Scrypt } from './scrypt'

/**
 * EncryptedMnemonicHdNode extends MnemonicHdNode to implement promise-based privKey resolution.
 * This allows latent based implementation where privKey need to be decrypted.
 *
 * - BIP32 Hierarchical Deterministic Wallets
 * - BIP39 Mnemonic code for generating deterministic keys
 * - BIP44 Multi-Account Hierarchy for Deterministic Wallets
 */
export class EncryptedMnemonicHdNode extends MnemonicHdNode {
  constructor (
    path: string,
    chainCode: Buffer,
    options: Bip32Options,
    private readonly rootPubKey: Buffer,
    private readonly promisePrivKey: () => Promise<Buffer>
  ) {
    super(path, Buffer.alloc(0), chainCode, options)
  }

  /**
   * Latent based implementation where privKey need to be resolved via a promise.
   */
  protected async deriveNode (): Promise<bip32.BIP32Interface> {
    const rootPrivKey = await this.promisePrivKey()
    return bip32.fromPrivateKey(rootPrivKey, this.chainCode, this.options)
      .derivePath(this.path)
  }

  /**
   * @return Promise<Buffer> compressed public key
   */
  async publicKey (): Promise<Buffer> {
    return bip32.fromPublicKey(this.rootPubKey, this.chainCode, this.options)
      .derivePath(this.path)
      .publicKey
  }
}

/**
 * EncryptedProviderData data encoded as hex.
 */
export interface EncryptedProviderData {
  /* Encoded as string hex */
  pubKey: string
  /* Encoded as string hex */
  chainCode: string
  /* Encoded as string hex via [].join(' ') */
  encryptedWords: string
}

/**
 * Promise based Passphrase Prompt from EncryptedHdNodeProvider.
 * For on-demand request passphrase to decrypt EncryptedProviderData.
 */
export type PromptPassphrase = () => Promise<string>

/**
 * EncryptedHdNodeProvider implements MnemonicHdNode implementation privateKey on-demand decryption via scrypt.
 *
 */
export class EncryptedHdNodeProvider implements WalletHdNodeProvider<EncryptedMnemonicHdNode> {
  private constructor (
    public readonly data: EncryptedProviderData,
    public readonly options: Bip32Options,
    private readonly scrypt: Scrypt,
    private readonly promptPassphrase: PromptPassphrase
  ) {
  }

  /**
   * @param {string} path to derive with on-demand node
   * @return EncryptedMnemonicHdNode with promisePrivKey that will only be resolved and decrypted when privateKey is accessed
   */
  derive (path: string): EncryptedMnemonicHdNode {
    const encryptedWords = this.data.encryptedWords
    const rootPubKey = Buffer.from(this.data.pubKey, 'hex')
    const chainCode = Buffer.from(this.data.chainCode, 'hex')

    const promisePrivKey = async (): Promise<Buffer> => {
      const passphrase = await this.promptPassphrase()
      const buffer = await this.scrypt.decrypt(encryptedWords, passphrase)
      const words = buffer.toString('hex').split(' ')
      const mnemonic = MnemonicHdNodeProvider.wordsToData(words, this.options)
      return Buffer.from(mnemonic.privKey, 'hex')
    }

    return new EncryptedMnemonicHdNode(path, chainCode, this.options, rootPubKey, promisePrivKey)
  }

  /**
   * @param {string[]} words to convert into EncryptedProviderData
   * @param {Bip32Options} options
   * @param {string} scrypt to encrypt mnemonic words
   * @param {string} passphrase to encrypt mnemonic words with
   * @return EncryptedProviderData with unencrypted "pubKey & chainCode" and scrypt encoded 'encryptedPrivKey'
   */
  static async wordsToEncryptedData (words: string[], options: Bip32Options, scrypt: Scrypt, passphrase: string): Promise<EncryptedProviderData> {
    const mnemonic = MnemonicHdNodeProvider.wordsToData(words, options)
    const privKey = Buffer.from(mnemonic.privKey, 'hex')
    const chainCode = Buffer.from(mnemonic.chainCode, 'hex')
    const root = bip32.fromPrivateKey(privKey, chainCode, options)

    const wordsBuffer = Buffer.from(words.join(' '), 'hex')
    const encryptedWords = await scrypt.encrypt(wordsBuffer, passphrase)

    return {
      pubKey: root.publicKey.toString('hex'),
      chainCode: mnemonic.chainCode,
      encryptedWords: encryptedWords.encode()
    }
  }

  /**
   * @param {EncryptedProviderData} data with unencrypted "pubKey & chainCode" and scrypt encoded 'encryptedPrivKey'
   * @param {Bip32Options} options
   * @param {string} scrypt to decrypt encrypted private key
   * @param {PromptPassphrase} promptPassphrase for on-demand request passphrase to decrypt encrypted private key
   * @return EncryptedHdNodeProvider
   */
  static init (data: EncryptedProviderData, options: Bip32Options, scrypt: Scrypt, promptPassphrase: PromptPassphrase): EncryptedHdNodeProvider {
    return new EncryptedHdNodeProvider(data, options, scrypt, promptPassphrase)
  }
}
