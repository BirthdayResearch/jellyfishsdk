import { Storage, ScryptStorage } from '../src'

// Mock storage
let inMemory: string | undefined
const storage: Storage = {
  getter: async () => inMemory,
  setter: async (encrypted: string | undefined) => { inMemory = encrypted }
}

// 32 bytes
const samplePublicKey = 'e9873d79c6d87dc0fb6a5778633389f4e93213303da61f20bd67fc233aa33262'

it('Should be able to encrypt / decrypt', async () => {
  const pass = 'password'
  const scryptStorage = new ScryptStorage(storage)

  const privateKey = Buffer.from(samplePublicKey, 'hex')
  await scryptStorage.encrypt(privateKey, pass)

  // encrypted data stored
  expect(await storage.getter()).not.toStrictEqual(null)

  const decrypted = await scryptStorage.decrypt(pass)
  expect(decrypted?.toString('hex')).toStrictEqual(samplePublicKey)
})

it('Should be able to encrypt / decrypt - simple passphrase', async () => {
  // let say a 6 digit pin
  const pass = '135790'
  const scryptStorage = new ScryptStorage(storage)

  const privateKey = Buffer.from(samplePublicKey, 'hex')
  await scryptStorage.encrypt(privateKey, pass)

  const decrypted = await scryptStorage.decrypt(pass)
  expect(decrypted?.toString('hex')).toStrictEqual(samplePublicKey)
})

it('decrypt() - should return null when no data in storage', async () => {
  // let say a 6 digit pin
  const pass = 'password'
  const scryptStorage = new ScryptStorage(storage)

  const decrypted = await scryptStorage.decrypt(pass)
  expect(decrypted).toStrictEqual(null)
})

it('Should work with variable data length', async () => {
  const longData = 'aabbccddeeffe9873d79c6d87dc0fb6a5778633389f4e93213303da61f20bd67fc233aa33262'
  const pass = 'password'
  const scryptStorage = new ScryptStorage(storage)

  const data = Buffer.from(longData, 'hex')
  await scryptStorage.encrypt(data, pass)

  const decrypted = await scryptStorage.decrypt(pass)
  expect(decrypted?.toString('hex')).toStrictEqual(longData)
})

it('Should work with variable data length', async () => {
  const shortData = 'ffaa'
  const pass = 'password'
  const scryptStorage = new ScryptStorage(storage)

  const data = Buffer.from(shortData, 'hex')
  await scryptStorage.encrypt(data, pass)

  const decrypted = await scryptStorage.decrypt(pass)
  expect(decrypted?.toString('hex')).toStrictEqual(shortData)
})

it('Should reject odd number data length', async () => {
  const oddNumberLen = 'ffaabb'
  const pass = 'password'
  const scryptStorage = new ScryptStorage(storage)

  const data = Buffer.from(oddNumberLen, 'hex')
  await expect(async () => {
    await scryptStorage.encrypt(data, pass)
  }).rejects.toThrow('Data length must be even number')

  const padded = Buffer.from('00' + oddNumberLen, 'hex')
  await scryptStorage.encrypt(padded, pass)

  const decrypted = await scryptStorage.decrypt(pass)
  expect(decrypted?.toString('hex')).toStrictEqual(padded.toString('hex'))
})
