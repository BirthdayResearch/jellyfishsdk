import BigNumber from 'bignumber.js'
import { EncryptedHdNodeProvider, EncryptedMnemonicHdNode, PrivateKeyEncryption } from '../src'
import { MnemonicHdNode, MnemonicHdNodeProvider } from '@defichain/jellyfish-wallet-mnemonic'
import { OP_CODES, Transaction, Vout } from '@defichain/jellyfish-transaction'
import { HASH160 } from '@defichain/jellyfish-crypto'

const regTestBip32Options = {
  bip32: {
    public: 0x043587cf,
    private: 0x04358394
  },
  wif: 0xef
}

const transaction: Transaction = {
  version: 0x00000004,
  lockTime: 0x00000000,
  vin: [{
    index: 0,
    script: { stack: [] },
    sequence: 4294967278,
    txid: '9f96ade4b41d5433f4eda31e1738ec2b36f6e7d1420d94a6af99801a88f7f7ff'
  }],
  vout: [{
    script: {
      stack: [
        OP_CODES.OP_0,
        OP_CODES.OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
      ]
    },
    value: new BigNumber('5.98'),
    tokenId: 0x00
  }]
}

const prevout: Vout = {
  script: {
    stack: [
      OP_CODES.OP_0,
      OP_CODES.OP_PUSHDATA(Buffer.from('1d0f172a0ecb48aee1be1f2687d2963ae33f71a1', 'hex'), 'little')
    ]
  },
  value: new BigNumber('6'),
  tokenId: 0x00
}

describe('24 words: random with passphrase "random" (exact same test in jellyfish-wallet-mnemonic)', () => {
  const encryption = new PrivateKeyEncryption()
  let provider: EncryptedHdNodeProvider

  beforeAll(async () => {
    const words = MnemonicHdNodeProvider.generateWords(24)
    const passphrase = 'random'
    const data = await EncryptedHdNodeProvider.wordsToEncryptedData(
      words,
      regTestBip32Options,
      encryption,
      passphrase
    )
    provider = EncryptedHdNodeProvider.init(data, regTestBip32Options, encryption, async () => passphrase)
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

    it('should not derive pub key uncompressed because hardened', async () => {
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

  describe('0/0/0', () => {
    let node: MnemonicHdNode

    beforeEach(() => {
      node = provider.derive('0/0/0')
    })

    it('should derive pub key', async () => {
      const derivedPubKey = await node.publicKey()
      expect(derivedPubKey.length).toStrictEqual(33)
    })

    it('should derive pub key uncompressed', async () => {
      const derivedPubKeyUncompressed = await node.publicKeyUncompressed()
      expect(derivedPubKeyUncompressed.length).toStrictEqual(65)
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

    it('should sign tx', async () => {
      const signed = await node.signTx(transaction, [{
        ...prevout,
        script: {
          stack: [
            OP_CODES.OP_0,
            OP_CODES.OP_PUSHDATA(HASH160(await node.publicKey()), 'little')
          ]
        }
      }])

      expect(signed.witness.length).toStrictEqual(1)
      expect(signed.witness[0].scripts.length).toStrictEqual(2)

      expect(signed.witness[0].scripts[0].hex.length).toBeGreaterThanOrEqual(140)
      expect(signed.witness[0].scripts[0].hex.length).toBeLessThanOrEqual(142)
      expect(signed.witness[0].scripts[1].hex.length).toStrictEqual(66)
    })
  })
})

describe('24 words: abandon x23 art with passphrase "jellyfish-wallet-encrypted" (exact same test in jellyfish-wallet-mnemonic)', () => {
  const encryption = new PrivateKeyEncryption()
  let provider: EncryptedHdNodeProvider

  beforeAll(async () => {
    const words = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art'.split(' ')
    const passphrase = 'jellyfish-wallet-encrypted'
    const data = await EncryptedHdNodeProvider.wordsToEncryptedData(
      words,
      regTestBip32Options,
      encryption,
      passphrase
    )
    provider = EncryptedHdNodeProvider.init(data, regTestBip32Options, encryption, async () => passphrase)
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

    it('should not derive pub key uncompressed because hardened', async () => {
      const promise = node.publicKey()
      await expect(promise).rejects.toThrowError('Missing private key for hardened child key')
    })

    it('should derive priv key', async () => {
      const privKey = await node.privateKey()
      expect(privKey.toString('hex')).toStrictEqual('b5b25c4628c5bb31a673ee8d1ab4c378ae50df2b173cf99d26cfe7848d834628')
    })

    it('should sign and verify', async () => {
      const hash = Buffer.from('e9071e75e25b8a1e298a72f0d2e9f4f95a0f5cdf86a533cda597eb402ed13b3a', 'hex')

      const signature = await node.sign(hash)
      expect(signature.toString('hex')).toStrictEqual('304402203d6b4db36c211f41c4fe38295cf73e8872719a38d88b54e0aa3968cf075c162f02200989c4e66f1ec8dfb3d612ded1892bb026ff6c40aeb81c1c36aea7b64622eec7')

      const valid = await node.verify(hash, signature)
      expect(valid).toStrictEqual(true)
    })
  })

  describe("44'/1129'/1'/0/0", () => {
    let node: EncryptedMnemonicHdNode

    beforeEach(() => {
      node = provider.derive("44'/1129'/1'/0/0")
    })

    it('should not derive pub key', async () => {
      const promise = node.publicKey()
      await expect(promise).rejects.toThrowError('Missing private key for hardened child key')
    })

    it('should not derive pub key uncompressed', async () => {
      const promise = node.publicKeyUncompressed()
      await expect(promise).rejects.toThrowError('Missing private key for hardened child key')
    })

    it('should derive priv key', async () => {
      const privKey = await node.privateKey()
      expect(privKey.toString('hex')).toStrictEqual('93ec40698d0819e6f9cb9cdd56c0f17c4c9165cb46a691680c6062976458f97c')
    })

    it('should sign and verify', async () => {
      const hash = Buffer.from('e9071e75e25b8a1e298a72f0d2e9f4f95a0f5cdf86a533cda597eb402ed13b3a', 'hex')

      const signature = await node.sign(hash)
      expect(signature.toString('hex')).toStrictEqual('3044022017fd6b15966223f557b4808b143e2333e8100dae1162aa70404043f640c6d87e02207aead802d1fe8bef1f01320234fc827a5bb74950f03717273b80ff7a8b3d13f8')

      const valid = await node.verify(hash, signature)
      expect(valid).toStrictEqual(true)
    })
  })

  describe('0/0/0', () => {
    let node: MnemonicHdNode

    beforeEach(() => {
      node = provider.derive('0/0/0')
    })

    it('should derive pub key', async () => {
      const derivedPubKey = await node.publicKey()
      expect(derivedPubKey.toString('hex')).toStrictEqual('0357e2eb9dee0792a24c7a9047bd05e28acd7a9275bc2b33916b1e434993f5db96')
    })

    it('should derive pub key uncompressed', async () => {
      const derivedPubKey = await node.publicKeyUncompressed()
      expect(derivedPubKey.toString('hex')).toStrictEqual('0457e2eb9dee0792a24c7a9047bd05e28acd7a9275bc2b33916b1e434993f5db967f9c7f228e5a015fbd7d1c1bd744af6099ec3ffc37815cf982c5a70dd438ba63')
    })

    it('should derive priv key', async () => {
      const privKey = await node.privateKey()
      expect(privKey.toString('hex')).toStrictEqual('c168700046e2cdfab52f5da5d5975ecaaaffa45c5b174100a0dab260a252cd43')
    })

    it('should sign and verify', async () => {
      const hash = Buffer.from('e9071e75e25b8a1e298a72f0d2e9f4f95a0f5cdf86a533cda597eb402ed13b3a', 'hex')

      const signature = await node.sign(hash)
      expect(signature.toString('hex')).toStrictEqual('30440220467af7ace148ad6cc0d16b1197ac497b0d8abee2262484026ebe8263711d1f4f02203e598cb442b480d8579c14efb8bee28acf0bfbd45a563115804cc4b96f7f56a3')

      const valid = await node.verify(hash, signature)
      expect(valid).toStrictEqual(true)
    })

    it('should sign tx', async () => {
      const signed = await node.signTx(transaction, [{
        ...prevout,
        script: {
          stack: [
            OP_CODES.OP_0,
            OP_CODES.OP_PUSHDATA(HASH160(await node.publicKey()), 'little')
          ]
        }
      }])

      expect(signed.witness.length).toStrictEqual(1)
      expect(signed.witness[0].scripts.length).toStrictEqual(2)

      expect(signed.witness[0].scripts[0].hex).toStrictEqual('30440220185e6303835b2031806ffc3bead6c2979bbfb8cb76cce7eaabd0455c247fb74402203eb29b1ce28c3095fbd061fe304c2a14cae23f7b6be518c8f6d531e5648df4ab01')
      expect(signed.witness[0].scripts[1].hex).toStrictEqual('0357e2eb9dee0792a24c7a9047bd05e28acd7a9275bc2b33916b1e434993f5db96')
    })
  })

  describe('1/0/0', () => {
    let node: MnemonicHdNode

    beforeEach(() => {
      node = provider.derive('1/0/0')
    })

    it('should derive pub key', async () => {
      const derivedPubKey = await node.publicKey()
      expect(derivedPubKey.toString('hex')).toStrictEqual('02dc83dda8b4e068d45fe63eaa12f2abbe4391569ffd25b031229275f9eb1f2efd')
    })

    it('should derive pub key uncompressed', async () => {
      const derivedPubKey = await node.publicKeyUncompressed()
      expect(derivedPubKey.toString('hex')).toStrictEqual('04dc83dda8b4e068d45fe63eaa12f2abbe4391569ffd25b031229275f9eb1f2efd3fce4ab6ff5a0903f2304e0772e2cc3ed1779e1d61ae6a08416ca0f425fba51e')
    })

    it('should derive priv key', async () => {
      const privKey = await node.privateKey()
      expect(privKey.toString('hex')).toStrictEqual('aca9b40bb55657e8f5e61298357edda0fa9ac88fbce8f60a3eb2b3d3d32dd20d')
    })

    it('should sign and verify', async () => {
      const hash = Buffer.from('e9071e75e25b8a1e298a72f0d2e9f4f95a0f5cdf86a533cda597eb402ed13b3a', 'hex')

      const signature = await node.sign(hash)
      expect(signature.toString('hex')).toStrictEqual('304402201a2cd2dd58ce73f2e68bf394db9543b357d4ad9c05a69ccf764a057cb445238c022012557da02591c6e9c5951b9fd339eade10e604146c547a5e5468f7ecaabc563c')

      const valid = await node.verify(hash, signature)
      expect(valid).toStrictEqual(true)
    })

    it('should sign tx', async () => {
      const signed = await node.signTx(transaction, [{
        ...prevout,
        script: {
          stack: [
            OP_CODES.OP_0,
            OP_CODES.OP_PUSHDATA(HASH160(await node.publicKey()), 'little')
          ]
        }
      }])

      expect(signed.witness.length).toStrictEqual(1)
      expect(signed.witness[0].scripts.length).toStrictEqual(2)

      expect(signed.witness[0].scripts[0].hex).toStrictEqual('304402207e9550e32dc22dda8ec2766aeb2644558ec96e1ae15844aa8cefca1dd18516c8022071b0086ea1219fbd9fa0fa4fa8b807203fc8ce206ecd2be048bb3f99c69a84d301')
      expect(signed.witness[0].scripts[1].hex).toStrictEqual('02dc83dda8b4e068d45fe63eaa12f2abbe4391569ffd25b031229275f9eb1f2efd')
    })
  })
})
