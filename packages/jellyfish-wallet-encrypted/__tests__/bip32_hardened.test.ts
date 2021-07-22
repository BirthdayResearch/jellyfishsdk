import { EncryptedHdNodeProvider, EncryptedMnemonicHdNode, Scrypt, SimpleScryptsy } from '../src'
import { MnemonicHdNodeProvider } from '@defichain/jellyfish-wallet-mnemonic'

const regTestBip32Options = {
  bip32: {
    public: 0x043587cf,
    private: 0x04358394
  },
  wif: 0xef
}

describe('24 words: random', () => {
  const scrypt = new Scrypt(new SimpleScryptsy({ N: 16384, r: 8, p: 1 }))
  let provider: EncryptedHdNodeProvider

  beforeAll(() => {
    const words = MnemonicHdNodeProvider.generateWords(24)
    const passphrase = 'random'
    const data = EncryptedHdNodeProvider.wordsToEncryptedData(
      words,
      regTestBip32Options,
      scrypt,
      passphrase
    )
    provider = EncryptedHdNodeProvider.init(data, regTestBip32Options, scrypt, async () => passphrase)
  })

  describe("44'/1129'/0'/0/0", () => {
    let node: EncryptedMnemonicHdNode

    beforeEach(() => {
      node = provider.derive("44'/1129'/0'/0/0")
    })

    it('should not derive pub key because hardened', async () => {
      const promise = node.publicKey()
      await expect(promise).rejects.toThrowError('Missing private key for hardened child key')
    })

    it('should derive priv key', async () => {
      const derivedPrivKey = await node.privateKey()
      expect(derivedPrivKey.length).toStrictEqual(32)
    })

    it('should sign and verify', async () => {
      const hash = Buffer.from('e9071e75e25b8a1e298a72f0d2e9f4f95a0f5cdf86a533cda597eb402ed13b3a', 'hex')

      const signature = await node.sign(hash)
      expect(signature.length).toBeLessThanOrEqual(70)
      expect(signature.length).toBeGreaterThanOrEqual(67) // 0.00001 probability of being this length

      const valid = await node.verify(hash, signature)
      expect(valid).toStrictEqual(true)
    })
  })
})

describe('24 words: abandon x23 art with passphrase jellyfish-wallet-encrypted (exact same test in jellyfish-wallet-mnemonic)', () => {
  const scrypt = new Scrypt(new SimpleScryptsy({ N: 16384, r: 8, p: 1 }))
  let provider: EncryptedHdNodeProvider

  beforeAll(() => {
    const words = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art'.split(' ')
    const passphrase = 'jellyfish-wallet-encrypted'
    const data = EncryptedHdNodeProvider.wordsToEncryptedData(
      words,
      regTestBip32Options,
      scrypt,
      passphrase
    )
    provider = EncryptedHdNodeProvider.init(data, regTestBip32Options, scrypt, async () => passphrase)
  })

  describe("44'/1129'/0'/0/0", () => {
    let node: EncryptedMnemonicHdNode

    beforeEach(() => {
      node = provider.derive("44'/1129'/0'/0/0")
    })

    it('should not derive pub key because hardened', async () => {
      const promise = node.publicKey()
      await expect(promise).rejects.toThrowError('Missing private key for hardened child key')
    })

    it('should derive priv key', async () => {
      const privKey = await node.privateKey()
      expect(privKey.toString('hex')).toStrictEqual('3e1f9339b4685c35d590fd1a6801967a9f95dbedf3e5733efa6451dc771a2d18')
    })

    it('should sign and verify', async () => {
      const hash = Buffer.from('e9071e75e25b8a1e298a72f0d2e9f4f95a0f5cdf86a533cda597eb402ed13b3a', 'hex')

      const signature = await node.sign(hash)
      expect(signature.toString('hex')).toStrictEqual('3044022070454813f8ff8e7a13f2ef9be18c89a3768d846647559798c147cd2ae284d1b1022058584df9e77efd620c7657f8d63eb7a2cd8c5753e3d29bc50bcb4c8c5c95ce49')

      const valid = await node.verify(hash, signature)
      expect(valid).toStrictEqual(true)
    })
  })

  describe("44'/1129'/1'/0/0", () => {
    let node: EncryptedMnemonicHdNode

    beforeEach(() => {
      node = provider.derive("44'/1129'/1'/0/0")
    })

    it('should derive pub key', async () => {
      const promise = node.publicKey()
      await expect(promise).rejects.toThrowError('Missing private key for hardened child key')
    })

    it('should derive priv key', async () => {
      const privKey = await node.privateKey()
      expect(privKey.toString('hex')).toStrictEqual('be7b3f86469900fc9302cea6bcf3b05c165a6461f8a0e7796305c350fc1f7357')
    })

    it('should sign and verify', async () => {
      const hash = Buffer.from('e9071e75e25b8a1e298a72f0d2e9f4f95a0f5cdf86a533cda597eb402ed13b3a', 'hex')

      const signature = await node.sign(hash)
      expect(signature.toString('hex')).toStrictEqual('304402201866354d84fb7b576c3a3248adb55582aa9a1c61b8d27dc355c4d9d07aa16b480220311133b0a69ab54a63406b1fce001c91d8a65ef665016d9792850edbe34a7598')

      const valid = await node.verify(hash, signature)
      expect(valid).toStrictEqual(true)
    })
  })
})
