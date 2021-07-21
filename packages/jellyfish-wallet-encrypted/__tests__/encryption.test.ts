import { SimpleScryptsy, SymmetricEncryption } from '../src'

const simpleScryptsy = new SimpleScryptsy()
const encryption = new SymmetricEncryption(simpleScryptsy)

it('should be able to encrypt / decrypt', async () => {
  const privKey = 'e9873d79c6d87dc0fb6a5778633389f4e93213303da61f20bd67fc233aa33262'
  const passphrase = 'password'
  const buffer = Buffer.from(privKey, 'hex')

  const data = encryption.encrypt(buffer, passphrase)
  expect(data).not.toStrictEqual(null)
  expect(data.encode()).not.toStrictEqual(null)

  const encoded = data.encode()
  const hash = data.hash.toString('hex')

  const decrypted = await encryption.decrypt(encoded, passphrase, hash)
  expect(decrypted).toStrictEqual(buffer)
  expect(decrypted.toString('hex')).toStrictEqual(privKey)
})

it('should be able to encrypt / decrypt - simple passphrase, a 6 digit pin', async () => {
  const privKey = 'e9873d79c6d87dc0fb6a5778633389f4e93213303da61f20bd67fc233aa33262'
  const passphrase = '135790'
  const buffer = Buffer.from(privKey, 'hex')

  const data = encryption.encrypt(buffer, passphrase)
  expect(data).not.toStrictEqual(null)
  expect(data.encode()).not.toStrictEqual(null)

  const encoded = data.encode()
  const hash = data.hash.toString('hex')

  const decrypted = await encryption.decrypt(encoded, passphrase, hash)
  expect(decrypted).toStrictEqual(buffer)
  expect(decrypted.toString('hex')).toStrictEqual(privKey)
})

it('Should work with variable data length - long', async () => {
  const privKey = 'e9873d79c6d87dc0fb6a5778633389f4e93213303da61f20bd67fc233aa33262e9873d79c6d87dc0fb6a5778633389f4e93213303da61f20bd67fc233aa33262e9873d79c6d87dc0fb6a5778633389f4e93213303da61f20bd67fc233aa33262e9873d79c6d87dc0fb6a5778633389f4e93213303da61f20bd67fc233aa33262'
  const passphrase = 'passcode'
  const buffer = Buffer.from(privKey, 'hex')

  const data = encryption.encrypt(buffer, passphrase)
  expect(data).not.toStrictEqual(null)
  expect(data.encode()).not.toStrictEqual(null)

  const encoded = data.encode()
  const hash = data.hash.toString('hex')

  const decrypted = await encryption.decrypt(encoded, passphrase, hash)
  expect(decrypted).toStrictEqual(buffer)
  expect(decrypted.toString('hex')).toStrictEqual(privKey)
})

it('should work with variable data length - short', async () => {
  const privKey = '1234'
  const passphrase = 'passcode'
  const buffer = Buffer.from(privKey, 'hex')

  const data = encryption.encrypt(buffer, passphrase)
  expect(data).not.toStrictEqual(null)
  expect(data.encode()).not.toStrictEqual(null)

  const encoded = data.encode()
  const hash = data.hash.toString('hex')

  const decrypted = await encryption.decrypt(encoded, passphrase, hash)
  expect(decrypted).toStrictEqual(buffer)
  expect(decrypted.toString('hex')).toStrictEqual(privKey)
})

it('should accept "even" number data length', async () => {
  const buffer = Buffer.from('eeffaabb', 'hex')

  const data = await encryption.encrypt(buffer, 'password')
  expect(data).not.toStrictEqual(null)
})

it('should reject "odd" number data length', async () => {
  const buffer = Buffer.from('eeffaa', 'hex')

  await expect(async () => {
    await encryption.encrypt(buffer, 'password')
  }).rejects.toThrow('Data length must be even number')
})

it('should pad "odd" number data length', async () => {
  const padded = Buffer.from('00' + 'eeffaa', 'hex')
  encryption.encrypt(padded, 'password')
})
