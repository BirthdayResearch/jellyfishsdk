import { MnemonicHdNode, MnemonicHdNodeProvider, mnemonicToSeed, generateMnemonic } from '../../src'
import BigNumber from 'bignumber.js'
import { Transaction, Vout } from '@defichain/jellyfish-transaction'
import { OP_CODES } from '@defichain/jellyfish-transaction/src/script'
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

describe('24 words: random', () => {
  let provider: MnemonicHdNodeProvider

  beforeAll(() => {
    const words = generateMnemonic(24)
    const seed = mnemonicToSeed(words)
    provider = MnemonicHdNodeProvider.fromSeed(seed, regTestBip32Options)
  })

  describe("44'/1129'/0'/0/0", () => {
    let node: MnemonicHdNode

    beforeEach(() => {
      node = provider.derive("44'/1129'/0'/0/0")
    })

    it('should drive pub key', async () => {
      const derivedPubKey = await node.publicKey()
      expect(derivedPubKey.length).toStrictEqual(33)
    })

    it('should drive priv key', async () => {
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
    const seed = mnemonicToSeed(words)
    provider = MnemonicHdNodeProvider.fromSeed(seed, regTestBip32Options)
  })

  describe("44'/1129'/0'/0/0", () => {
    let node: MnemonicHdNode
    const pubKey = '037cf033b3c773dae3ce704e85fabef1702b25ad897533fe65b5c3f85912adebc1'

    beforeEach(() => {
      node = provider.derive("44'/1129'/0'/0/0")
    })

    it('should drive pub key', async () => {
      const derivedPubKey = await node.publicKey()
      expect(derivedPubKey.toString('hex')).toStrictEqual(pubKey)
    })

    it('should drive priv key', async () => {
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

      expect(signed.witness[0].scripts[0].hex).toStrictEqual('3044022039c1dd0ccc95e188bd997f955221f37d97eb135d3060d79aa584f0d6361e4083022012481d8505adecea60cd02b4a2c381c0323a5ff0eb780bea1a9d11485c2d6e6f01')
      expect(signed.witness[0].scripts[1].hex).toStrictEqual(pubKey)
    })
  })

  describe("44'/1129'/1'/0/0", () => {
    let node: MnemonicHdNode
    const pubKey = '03548dfc620bcd01f774ba24512b594040693898b49ca08ec4ea9fc99f319be34f'

    beforeEach(() => {
      node = provider.derive("44'/1129'/1'/0/0")
    })

    it('should drive pub key', async () => {
      const derivedPubKey = await node.publicKey()
      expect(derivedPubKey.toString('hex')).toStrictEqual(pubKey)
    })

    it('should drive priv key', async () => {
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

      expect(signed.witness[0].scripts[0].hex).toStrictEqual('30440220403d4733c626866ba4117cbf725cc7f6d547cc8bc012786345cb1e58a2693426022039597dd1c39c1a528b884b97a246dd24b6fc7a103ce29a15ef8402ca691b5b0901')
      expect(signed.witness[0].scripts[1].hex).toStrictEqual(pubKey)
    })
  })
})
