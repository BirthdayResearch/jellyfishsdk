import { ScryptStorage, Storage, SimpleScryptsy } from '../src'

class MockStorage implements Storage {
  inMemory: string | undefined
  async getter (): Promise<string|undefined> {
    return this.inMemory
  }

  async setter (encrypted: string | undefined): Promise<void> {
    this.inMemory = encrypted
  }
}
// Mock storage
let scryptStorage: ScryptStorage
const encryptedSeedStorage = new MockStorage()
const seedHashStorage = new MockStorage()

const scryptProvider = new SimpleScryptsy()

// 32 bytes
const samplePrivateKey = 'e9873d79c6d87dc0fb6a5778633389f4e93213303da61f20bd67fc233aa33262'

beforeEach(async () => {
  scryptStorage = new ScryptStorage(scryptProvider, encryptedSeedStorage, seedHashStorage)
  await encryptedSeedStorage.setter(undefined)
  await seedHashStorage.setter(undefined)
})

it('Should be able to encrypt / decrypt', async () => {
  const pass = 'password'

  const privateKey = Buffer.from(samplePrivateKey, 'hex')
  await scryptStorage.encrypt(privateKey, pass)

  // encrypted data stored
  expect(await encryptedSeedStorage.getter()).not.toStrictEqual(null)

  const decrypted = await scryptStorage.decrypt(pass)
  expect(decrypted?.toString('hex')).toStrictEqual(samplePrivateKey)
})

it('Should be able to encrypt / decrypt - simple passphrase', async () => {
  // let say a 6 digit pin
  const pass = '135790'

  const privateKey = Buffer.from(samplePrivateKey, 'hex')
  await scryptStorage.encrypt(privateKey, pass)

  const decrypted = await scryptStorage.decrypt(pass)
  expect(decrypted?.toString('hex')).toStrictEqual(samplePrivateKey)
})

it('decrypt() - should return null when no data in storage', async () => {
  // let say a 6 digit pin
  const pass = 'password'

  const decrypted = await scryptStorage.decrypt(pass)
  expect(decrypted).toStrictEqual(null)
})

it('Should work with variable data length - long', async () => {
  const longData = samplePrivateKey + samplePrivateKey + samplePrivateKey + samplePrivateKey
  const pass = 'password'

  const data = Buffer.from(longData, 'hex')
  await scryptStorage.encrypt(data, pass)

  const decrypted = await scryptStorage.decrypt(pass)
  expect(decrypted?.toString('hex')).toStrictEqual(longData)
})

it('Should work with variable data length - short', async () => {
  const shortData = 'ffaa'
  const pass = 'password'

  const data = Buffer.from(shortData, 'hex')
  await scryptStorage.encrypt(data, pass)

  const decrypted = await scryptStorage.decrypt(pass)
  expect(decrypted?.toString('hex')).toStrictEqual(shortData)
})

it('Should reject "odd" number long data, only accept "even" number long data', async () => {
  const pass = 'password'

  const fourBytes = 'eeffaabb'
  await scryptStorage.encrypt(Buffer.from(fourBytes, 'hex'), pass)

  const threeBytes = 'ffaabb'
  const data = Buffer.from(threeBytes, 'hex')
  await expect(async () => {
    await scryptStorage.encrypt(data, pass)
  }).rejects.toThrow('Data length must be even number')

  const padded = Buffer.from('00' + threeBytes, 'hex')
  await scryptStorage.encrypt(padded, pass)

  const decrypted = await scryptStorage.decrypt(pass)
  expect(decrypted?.toString('hex')).toStrictEqual(padded.toString('hex'))
})
