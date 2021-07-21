import { WalletHdNodeProvider } from "@defichain/jellyfish-wallet";
import * as bip32 from 'bip32'
import { Bip32Options, MnemonicHdNode } from "@defichain/jellyfish-wallet-mnemonic/hd_node";

export class EncryptedMnemonicHdNode extends MnemonicHdNode {
}

export interface EncryptedStorage {
  getPublicKey (): Promise<string>

  getChainCode (): Promise<string>

  getPrivateKeyEncrypted (): Promise<string>

  getPrivateKeyPassphrase (): Promise<string>
}

export class EncryptedHdNodeProvider implements WalletHdNodeProvider<EncryptedMnemonicHdNode> {
  private constructor (
    private readonly pubKey: () => Promise<Buffer>,
    private readonly privKey: () => Promise<Buffer>,
    private readonly chainCode: () => Promise<Buffer>,
    private readonly options: Bip32Options
  ) {
  }

  derive (path: string): EncryptedMnemonicHdNode {
    const pubKeyProvider = async () => {
      const root = bip32.fromPublicKey(await this.pubKey(), await this.chainCode(), this.options)
      return root.derivePath(path).publicKey
    }

    const deriveProvider = async (path: string) => {
      const root = bip32.fromPublicKey(await this.privKey(), await this.chainCode(), this.options)
      return root.derivePath(path)
    }

    return new MnemonicHdNode(path, pubKeyProvider, deriveProvider)
  }

  static from (
    pubKey: () => Promise<Buffer>,
    privKey: () => Promise<Buffer>,
    chainCode: () => Promise<Buffer>,
    options: Bip32Options
  ) {
    return new EncryptedHdNodeProvider(pubKey, privKey, chainCode, options)
  }

  static fromStorage (storage: EncryptedStorage, options: Bip32Options) {
    const decryptProvider = async (): Promise<Buffer> => {
      const passphrase = await storage.getPrivateKeyPassphrase()
      const encrypted = Buffer.from(await storage.getPrivateKeyEncrypted(), 'hex')

      // TODO(fuxingloh):
      return encrypted
    }

    return this.from(
      async () => Buffer.from(await storage.getPublicKey(), 'hex'),
      decryptProvider,
      async () => Buffer.from(await storage.getChainCode(), 'hex'),
      options
    )
  }
}

// TODO(fuxingloh): generator
