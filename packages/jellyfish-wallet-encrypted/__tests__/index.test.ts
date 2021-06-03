import { ScryptStorage, Storage, SimpleScryptsy } from '../src'

// Mock storage
let scryptStorage: ScryptStorage
let inMemory: string | undefined
const storage: Storage = {
  getter: async () => inMemory,
  setter: async (encrypted: string | undefined) => { inMemory = encrypted }
}

const scryptProvider = new SimpleScryptsy()

// 32 bytes
const samplePrivateKey = 'e9873d79c6d87dc0fb6a5778633389f4e93213303da61f20bd67fc233aa33262'

beforeEach(() => {
  scryptStorage = new ScryptStorage(scryptProvider, storage)
  inMemory = undefined
})

it('Should be able to encrypt / decrypt', async () => {
  const pass = 'password'

  const privateKey = Buffer.from(samplePrivateKey, 'hex')
  await scryptStorage.encrypt(privateKey, pass)

  // encrypted data stored
  expect(await storage.getter()).not.toStrictEqual(null)

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

it('Should reject odd number data length', async () => {
  const oddNumberLen = 'ffaabb'
  const pass = 'password'

  const data = Buffer.from(oddNumberLen, 'hex')
  await expect(async () => {
    await scryptStorage.encrypt(data, pass)
  }).rejects.toThrow('Data length must be even number')

  const padded = Buffer.from('00' + oddNumberLen, 'hex')
  await scryptStorage.encrypt(padded, pass)

  const decrypted = await scryptStorage.decrypt(pass)
  expect(decrypted?.toString('hex')).toStrictEqual(padded.toString('hex'))
})
