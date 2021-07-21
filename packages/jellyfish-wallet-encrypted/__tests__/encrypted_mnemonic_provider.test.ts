import BigNumber from 'bignumber.js'
import { OP_CODES, Transaction, Vout } from '@defichain/jellyfish-transaction'
import { EncryptedMnemonicProvider, OnDemandMnemonicHdNode, ScryptStorage, SimpleScryptsy, Storage } from '../src'
import { HASH160 } from '@defichain/jellyfish-crypto'

// Mock storage
class MockStore implements Storage {
  inMemory: string | undefined

  async getter (): Promise<string | undefined> {
    return this.inMemory
  }

  async setter (data: string | undefined): Promise<void> {
    this.inMemory = data
  }
}

const sampleMnemonicSeed = 'e9873d79c6d87dc0fb6a5778633389f4e93213303da61f20bd67fc233aa33262'
const scryptPovider = new SimpleScryptsy({
  N: 16384,
  r: 8,
  p: 1 // to speed up test, p = 8 take ~4s for each encrypt or decrypt
})

describe('EncryptedMnemonicProvider', () => {
  let provider: EncryptedMnemonicProvider
  const seedStore = new MockStore()
  const seedHashStore = new MockStore()
  let node: OnDemandMnemonicHdNode

  beforeEach(async () => {
    const seed = Buffer.from(sampleMnemonicSeed, 'hex')
    const collectPassphrase = async (): Promise<string> => 'password'

    provider = await EncryptedMnemonicProvider.create({
      scryptStorage: new ScryptStorage(
        scryptPovider, // client platform supported encryption implementation
        seedStore, // client provided interface to get/set encrypted seed
        seedHashStore // client provided interface to get/set encrypted seedHash, for passphrase validation
      ),
      seed, // new wallet, pass in seed
      collectPassphrase, // interface, wait for user input
      options: { // bip32 options
        bip32: {
          public: 0x00000000,
          private: 0x00000000
        },
        wif: 0x00
      }
    })

    node = await provider.derive("44'/1129'/0'/0/0")

    const pubKey = await node.publicKey()
    const privKey = await node.privateKey()
    expect(pubKey.length).toStrictEqual(33)
    expect(privKey.length).toStrictEqual(32)
  })

  it('EncryptedMnemonicProvider.load() - should be able to load/restore a provider instance', async () => {
    const loaded = await EncryptedMnemonicProvider.load({
      scryptStorage: new ScryptStorage(
        scryptPovider, // must have same Scrypt logic
        seedStore, // already holding the encrypted seed
        seedHashStore // already holding the seed hash
      ),
      collectPassphrase: async () => 'password',
      options: {
        bip32: {
          public: 0x00000000,
          private: 0x00000000
        },
        wif: 0x00
      }
    })

    const pubKey = await node.publicKey()
    const privKey = await node.privateKey()

    const loadedNode = await loaded.derive("44'/1129'/0'/0/0")
    const loadedPubKey = await loadedNode.publicKey()
    const loadedPrivKey = await loadedNode.privateKey()

    expect(pubKey.toString('hex')).toStrictEqual(loadedPubKey.toString('hex'))
    expect(privKey.toString('hex')).toStrictEqual(loadedPrivKey.toString('hex'))
  })

  it('Should be able to derive multiple node/elliptic pair and unlockable with same passphrase', async () => {
    const node1 = await provider.derive("44'/1129'/1'/0/0")
    const pubKey1 = await node1.publicKey()
    const privKey1 = await node1.privateKey()

    const node2 = await provider.derive("44'/1129'/2'/0/0")
    const pubKey2 = await node2.publicKey()
    const privKey2 = await node2.privateKey()
    expect(pubKey2.length).toStrictEqual(33)
    expect(privKey2.length).toStrictEqual(32)

    expect(pubKey1.toString('hex')).not.toStrictEqual(pubKey2.toString('hex'))
    expect(privKey1.toString('hex')).not.toStrictEqual(privKey2.toString('hex'))
  })

  it('Should be able to sign and verify', async () => {
    const hash = Buffer.from('e9071e75e25b8a1e298a72f0d2e9f4f95a0f5cdf86a533cda597eb402ed13b3a', 'hex')
    const signature = await node.sign(hash)

    expect(signature.length).toBeLessThanOrEqual(70)
    expect(signature.length).toBeGreaterThanOrEqual(67) // 0.00001 probability of being this length

    expect(await node.verify(hash, signature)).toBeTruthy()

    // meant to fail, differnt pubkey
    const anotherNode = await provider.derive("44'/1129'/1'/0/0")
    expect(await anotherNode.verify(hash, signature)).toBeFalsy()
  })

  it('signTx()', async () => {
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

  it('should failed to unlock seed using invalid password thus unable to access any data of hdnode', async () => {
    let password = 'valid-password'
    const seed = Buffer.from(sampleMnemonicSeed, 'hex')
    const collectPassphrase = async (): Promise<string> => password

    const provider = await EncryptedMnemonicProvider.create({
      scryptStorage: new ScryptStorage(
        scryptPovider, // client platform supported encryption implementation
        seedStore, // client provided interface to get/set encrypted seed
        seedHashStore // client provided interface to get/set encrypted seedHash, for passphrase validation
      ),
      seed, // new wallet, pass in seed
      collectPassphrase, // interface, wait for user input
      options: { // bip32 options
        bip32: {
          public: 0x00000000,
          private: 0x00000000
        },
        wif: 0x00
      }
    })

    const encryptedHdNode = provider.derive("44'/1129'/0'/0/0")
    const publicKey = await encryptedHdNode.publicKey() // no err thrown

    password = 'invalid'

    await expect(encryptedHdNode.publicKey()).rejects.toThrow('InvalidPassphrase')
    await expect(encryptedHdNode.privateKey()).rejects.toThrow('InvalidPassphrase')
    await expect(encryptedHdNode.sign(Buffer.from('e9071e75e25b8a1e298a72f0d2e9f4f95a0f5cdf86a533cda597eb402ed13b3a', 'hex'))).rejects.toThrow('InvalidPassphrase')
    await expect(encryptedHdNode.verify(Buffer.alloc(1), Buffer.alloc(1))).rejects.toThrow('InvalidPassphrase')

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

    await expect(encryptedHdNode.signTx(transaction, [{
      ...prevout,
      script: {
        stack: [
          OP_CODES.OP_0,
          OP_CODES.OP_PUSHDATA(HASH160(publicKey), 'little')
        ]
      }
    }])).rejects.toThrow('InvalidPassphrase')
  })
})
