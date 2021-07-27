import BigNumber from 'bignumber.js'
import { EncryptedHdNodeProvider, EncryptedMnemonicHdNode, Scrypt, SimpleScryptsy } from '../src'
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

it('should be able to access provider.data and provider.options', async () => {
  const scrypt = new Scrypt(new SimpleScryptsy({ N: 16384, r: 8, p: 1 }))
  const words = MnemonicHdNodeProvider.generateWords(24)
  const passphrase = 'random'
  const data = await EncryptedHdNodeProvider.wordsToEncryptedData(
    words,
    regTestBip32Options,
    scrypt,
    passphrase
  )
  const provider = EncryptedHdNodeProvider.init(data, regTestBip32Options, scrypt, async () => passphrase)

  expect(provider.data).toBeDefined()
  expect(provider.options).toBeDefined()
})

describe('24 words: random with passphrase "random" (exact same test in jellyfish-wallet-mnemonic)', () => {
  const scrypt = new Scrypt(new SimpleScryptsy({ N: 16384, r: 8, p: 1 }))
  let provider: EncryptedHdNodeProvider

  beforeAll(async () => {
    const words = MnemonicHdNodeProvider.generateWords(24)
    const passphrase = 'random'
    const data = await EncryptedHdNodeProvider.wordsToEncryptedData(
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

  describe('0/0/0', () => {
    let node: MnemonicHdNode

    beforeEach(() => {
      node = provider.derive('0/0/0')
    })

    it('should derive pub key', async () => {
      const derivedPubKey = await node.publicKey()
      expect(derivedPubKey.length).toStrictEqual(33)
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
  const scrypt = new Scrypt(new SimpleScryptsy({ N: 16384, r: 8, p: 1 }))
  let provider: EncryptedHdNodeProvider

  beforeAll(async () => {
    const words = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art'.split(' ')
    const passphrase = 'jellyfish-wallet-encrypted'
    const data = await EncryptedHdNodeProvider.wordsToEncryptedData(
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

  describe('0/0/0', () => {
    let node: MnemonicHdNode

    beforeEach(() => {
      node = provider.derive('0/0/0')
    })

    it('should derive pub key', async () => {
      const derivedPubKey = await node.publicKey()
      expect(derivedPubKey.toString('hex')).toStrictEqual('03d0d24a126c861c02622cb4ee75b860d6e65d1d6ffee20bf5793c1a00ade37db5')
    })

    it('should derive priv key', async () => {
      const privKey = await node.privateKey()
      expect(privKey.toString('hex')).toStrictEqual('209fab36379401ac23960f0890ac1cc880e9c6e351a8525dac59a3ea6bb4ebb7')
    })

    it('should sign and verify', async () => {
      const hash = Buffer.from('e9071e75e25b8a1e298a72f0d2e9f4f95a0f5cdf86a533cda597eb402ed13b3a', 'hex')

      const signature = await node.sign(hash)
      expect(signature.toString('hex')).toStrictEqual('3044022007340e6a1052ca16acb180f33dd6781c60e2aa1acd27f4b50c13c6f370c9c8a802206fca4fd8263eb84d6e2c8d6111a5663b5da59eec843aab5cbfcbb273d497917c')

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

      expect(signed.witness[0].scripts[0].hex).toStrictEqual('304402202c7ba3ded9cb503e8afb8a14ddb16ef4ea66043157e2a76e40d5d534fa80114302202aa1ea35654e2cd59a9f2e325037b38ef3d3939b47041782f05c819b1090dbd201')
      expect(signed.witness[0].scripts[1].hex).toStrictEqual('03d0d24a126c861c02622cb4ee75b860d6e65d1d6ffee20bf5793c1a00ade37db5')
    })
  })

  describe('1/0/0', () => {
    let node: MnemonicHdNode

    beforeEach(() => {
      node = provider.derive('1/0/0')
    })

    it('should derive pub key', async () => {
      const derivedPubKey = await node.publicKey()
      expect(derivedPubKey.toString('hex')).toStrictEqual('0332b504dca50e2f9f369ac3bdc1a29fc5a082c9a35cc60f54d4c115518bb7a824')
    })

    it('should derive priv key', async () => {
      const privKey = await node.privateKey()
      expect(privKey.toString('hex')).toStrictEqual('12137509a9c70bc0ac55f0897577ba55cd1c222a209096f7b27f3de4c1eef30d')
    })

    it('should sign and verify', async () => {
      const hash = Buffer.from('e9071e75e25b8a1e298a72f0d2e9f4f95a0f5cdf86a533cda597eb402ed13b3a', 'hex')

      const signature = await node.sign(hash)
      expect(signature.toString('hex')).toStrictEqual('3044022036a7d5ad851541745fa4081327ef846c262d46640cbb1f5d989c07db3400fe4a0220384de187749c731ea47036d4f4bb77db69961359b8c70a1da5750b9acec2e573')

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

      expect(signed.witness[0].scripts[0].hex).toStrictEqual('30440220729650b5ab2e325e13da49e474fa5f434f7c68f2d62a734e48c982a921b38830022069c02966ede1db87ac726326da7d5467775de23ec56516f151b31abbb90ec7e701')
      expect(signed.witness[0].scripts[1].hex).toStrictEqual('0332b504dca50e2f9f369ac3bdc1a29fc5a082c9a35cc60f54d4c115518bb7a824')
    })
  })
})
