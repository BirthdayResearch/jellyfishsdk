import { MnemonicHdNode, MnemonicHdNodeProvider } from '../src'
import BigNumber from 'bignumber.js'
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

describe('validation', () => {
  it('should validate mnemonic sentence and succeed 1000 times', () => {
    for (let i = 0; i < 1000; i++) {
      const words = MnemonicHdNodeProvider.generateWords(24)
      MnemonicHdNodeProvider.fromWords(words, regTestBip32Options, true)
    }
  })

  it('should validate mnemonic sentence and fail 1000 times', () => {
    for (let i = 0; i < 1000; i++) {
      const words = MnemonicHdNodeProvider.generateWords(24)
      words[0] = 'mnemonic'

      expect(() => {
        MnemonicHdNodeProvider.fromWords(words, regTestBip32Options, true)
      }).toThrow('mnemonic sentence checksum invalid')
    }
  })

  it('should not validate mnemonic sentence and not fail 1000 times', () => {
    for (let i = 0; i < 1000; i++) {
      const words = MnemonicHdNodeProvider.generateWords(24)
      words[0] = 'mnemonic'

      expect(() => {
        MnemonicHdNodeProvider.fromWords(words, regTestBip32Options, false)
      }).not.toThrow('mnemonic sentence checksum invalid')
    }
  })
})

describe('24 words: random', () => {
  let provider: MnemonicHdNodeProvider

  beforeAll(() => {
    const words = MnemonicHdNodeProvider.generateWords(24)
    provider = MnemonicHdNodeProvider.fromWords(words, regTestBip32Options)
  })

  describe('44\'/1129\'/0\'/0/0', () => {
    let node: MnemonicHdNode

    beforeEach(() => {
      node = provider.derive('44\'/1129\'/0\'/0/0')
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

describe('24 words: abandon x23 art', () => {
  let provider: MnemonicHdNodeProvider

  beforeAll(() => {
    const words = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art'.split(' ')
    provider = MnemonicHdNodeProvider.fromWords(words, regTestBip32Options)
  })

  describe('44\'/1129\'/0\'/0/0', () => {
    let node: MnemonicHdNode
    const pubKey = '034849fafd49b531a2b8a101993c34ea5c70bdc094fd4fc45d2fca2068d2143553'

    beforeEach(() => {
      node = provider.derive('44\'/1129\'/0\'/0/0')
    })

    it('should derive pub key', async () => {
      const derivedPubKey = await node.publicKey()
      expect(derivedPubKey.toString('hex')).toStrictEqual(pubKey)
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

      expect(signed.witness[0].scripts[0].hex).toStrictEqual('304402204d8c2fe002b537d0b04d0ace2b11d308bed62328ae36f9a540ab6e870af64abf022058b9a9eb3c2aa5e09b8dedbce93ca6751fb3725aa0fc7cab37540153941eaf7001')
      expect(signed.witness[0].scripts[1].hex).toStrictEqual(pubKey)
    })
  })

  describe('44\'/1129\'/1\'/0/0', () => {
    let node: MnemonicHdNode
    const pubKey = '032a530c06df4a2b4e50863da169733d57ec07c598f8188e5a0341952fa2580075'
    const pubKeyUncompressed = '042a530c06df4a2b4e50863da169733d57ec07c598f8188e5a0341952fa258007543f40fa0d2e62bb27a3da96e0bf76d045179a205bd76f65642f57372ea149561'

    beforeEach(() => {
      node = provider.derive('44\'/1129\'/1\'/0/0')
    })

    it('should derive pub key', async () => {
      const derivedPubKey = await node.publicKey()
      expect(derivedPubKey.toString('hex')).toStrictEqual(pubKey)
    })

    it('should derive pub key uncompressed', async () => {
      const derivedPubKeyUncompressed = await node.publicKeyUncompressed()
      expect(derivedPubKeyUncompressed.toString('hex')).toStrictEqual(pubKeyUncompressed)
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

      expect(signed.witness[0].scripts[0].hex).toStrictEqual('304402200a5da4731e6221afe5706d97c0f537668e7eadb8d86ad11fe35b10888d2d63f502201eba3eb749f129a0ee40626c455ed21f041317294ef0dc0de5362fb2162d54a101')
      expect(signed.witness[0].scripts[1].hex).toStrictEqual(pubKey)
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
