import { Aes256 } from '../src'

const raw = 'e9873d79c6d87dc0fb6a5778633389f4e93213303da61f20bd67fc233aa33262'
const privateKey = Buffer.from(raw, 'hex')
const passphrase = Buffer.from('password', 'ascii')

describe('Aes256', () => {
  let encrypted: Buffer

  it('', () => {
    encrypted = Aes256.encrypt(passphrase, privateKey)
    expect(encrypted.length).toStrictEqual(48) // [16 bytes salt, 32 bytes cipher]
  })

  it('encrypt', () => {
    encrypted = Aes256.encrypt(passphrase, privateKey)
    expect(encrypted.length).toStrictEqual(48) // [16 bytes salt, 32 bytes cipher]
  })

  it('decrypt - with valid passphrase', () => {
    const decrypted = Aes256.decrypt(passphrase, encrypted)
    expect(decrypted.toString('hex')).toStrictEqual(raw)
  })

  it('decrypt - with invalid passphrase', () => {
    const invalid = Aes256.decrypt(passphrase.slice(1), encrypted)
    expect(invalid.length).toStrictEqual(32)
    expect(invalid.toString('hex')).not.toStrictEqual(raw)
  })

  it('decrypt - data too short, insufficient length to include salt', () => {
    const invalidData = Buffer.alloc(16)
    expect(() => {
      Aes256.decrypt(passphrase, invalidData)
    }).toThrow('Provided "encrypted" must decrypt to a non-empty string or buffer')
  })
})
