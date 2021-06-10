import BigNumber from 'bignumber.js'
import { OP_CODES, Transaction, Vout } from '@defichain/jellyfish-transaction'
import { EncryptedMnemonicHdNode, EncryptedMnemonicProvider, ScryptStorage, SimpleScryptsy, Storage } from '../src'
import { HASH160 } from '@defichain/jellyfish-crypto'

// Mock storage
class MockStore implements Storage {
  inMemory: string | undefined
  async getter (): Promise<string|undefined> {
    return this.inMemory
  }

  async setter (data: string|undefined): Promise<void> {
    this.inMemory = data
  }
}

const sampleMnemonicSeed = 'e9873d79c6d87dc0fb6a5778633389f4e93213303da61f20bd67fc233aa33262'
const passphrase = 'password'
const scryptPovider = new SimpleScryptsy({
  N: 16384,
  r: 8,
  p: 1 // to speed up test, p = 8 take ~4s for each encrypt or decrypt
})

describe('EncryptedMnemonicProvider', () => {
  let provider: EncryptedMnemonicProvider
  const seedStore = new MockStore()
  const seedHashStore = new MockStore()
  let node: EncryptedMnemonicHdNode

  beforeEach(async () => {
    const seed = Buffer.from(sampleMnemonicSeed, 'hex')
    provider = await EncryptedMnemonicProvider.create({
      scryptStorage: new ScryptStorage(scryptPovider, seedStore, seedHashStore),
      seed,
      passphrase: passphrase,
      options: {
        bip32: {
          public: 0x00000000,
          private: 0x00000000
        },
        wif: 0x00
      }
    })

    // tested deriveWithSeed() here
    node = await provider.deriveWithSeed("44'/1129'/0'/0/0", seed)

    const pubKey = await node.publicKey()
    const privKey = await node.privateKey(passphrase)
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
      passphrase: passphrase,
      options: {
        bip32: {
          public: 0x00000000,
          private: 0x00000000
        },
        wif: 0x00
      }
    })

    const pubKey = await node.publicKey()
    const privKey = await node.privateKey(passphrase)

    const loadedNode = await loaded.unlockAndDerive("44'/1129'/0'/0/0", passphrase)
    const loadPubKey = await loadedNode.publicKey()
    const loadPrivKey = await loadedNode.privateKey(passphrase)

    expect(pubKey.toString('hex')).toStrictEqual(loadPubKey.toString('hex'))
    expect(privKey.toString('hex')).toStrictEqual(loadPrivKey.toString('hex'))
  })

  it('deriveWithSeed() - invalid seed', async () => {
    await expect(provider.deriveWithSeed("44'/1129'/0'/0/0", Buffer.from('e9873d79c6d87dc0fb6a5778633389f4e93213303da61f20bd67fc233aa33261'))).rejects
      .toThrow('InvalidSeedHash')
  })

  it('unlockAndDerive() - invalid passphrase', async () => {
    await expect(provider.unlockAndDerive("44'/1129'/0'/0/0", 'incorrect password')).rejects
      .toThrow('InvalidPassphrase')
  })

  it('unlockAndDerive() - encrypted key missing', async () => {
    // delete encrypted seed
    await seedStore.setter(undefined)
    await expect(provider.unlockAndDerive("44'/1129'/0'/0/0", 'incorrect password')).rejects
      .toThrow('No encrypted seed found in storage')
  })

  it('unlockAndDerive() - should behave the same as deriveWithSeed() when valid passphrase provided', async () => {
    const pubKey = await node.publicKey()
    const privKey = await node.privateKey(passphrase)

    const derivedUsingPassphrase = await provider.unlockAndDerive("44'/1129'/0'/0/0", passphrase)
    const pubKey2 = await derivedUsingPassphrase.publicKey()
    const privKey2 = await derivedUsingPassphrase.privateKey(passphrase)

    expect(pubKey.toString('hex')).toStrictEqual(pubKey2.toString('hex'))
    expect(privKey.toString('hex')).toStrictEqual(privKey2.toString('hex'))
  })

  it('Should be able to derive multiple node/elliptic pair and unlockable with same passphrase', async () => {
    const pubKey = await node.publicKey()
    const privKey = await node.privateKey(passphrase)

    const node2 = await provider.unlockAndDerive("44'/1129'/1'/0/0", passphrase)
    const pubKey2 = await node2.publicKey()
    const privKey2 = await node2.privateKey(passphrase)
    expect(pubKey2.length).toStrictEqual(33)
    expect(privKey2.length).toStrictEqual(32)

    expect(pubKey.toString('hex')).not.toStrictEqual(pubKey2.toString('hex'))
    expect(privKey.toString('hex')).not.toStrictEqual(privKey2.toString('hex'))
  })

  it('Should be able to unlock with valid passphrase', async () => {
    await expect(node.unlock('something else')).rejects
      .toThrow('InvalidPassphrase')

    const unlocked = await node.unlock(passphrase)
    expect(unlocked).toBeTruthy()
    expect(await unlocked.publicKey()).toBeTruthy()
  })

  it('Should be able to unlock with valid passphrase', async () => {
    await seedStore.setter(undefined)
    await expect(node.unlock(passphrase)).rejects
      .toThrow('No encrypted seed found in storage')
  })

  it('Should be able to sign and verify', async () => {
    const hash = Buffer.from('e9071e75e25b8a1e298a72f0d2e9f4f95a0f5cdf86a533cda597eb402ed13b3a', 'hex')
    const signature = await node.sign(passphrase, hash)

    expect(signature.length).toBeLessThanOrEqual(70)
    expect(signature.length).toBeGreaterThanOrEqual(67) // 0.00001 probability of being this length

    expect(await node.verify(hash, signature)).toBeTruthy()

    const node2 = await provider.unlockAndDerive("44'/1129'/1'/0/0", passphrase)
    expect(await node2.verify(hash, signature)).toBeFalsy()
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

    const signed = await node.signTx(passphrase, transaction, [{
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
