import randomBytes from 'randombytes'
import aes from 'browserify-aes'
import { SHA256 } from './hash'

const CIPHER_ALGORITHM = 'aes-256-ctr'

/**
 * Encrypt a clear-text message using AES-256 plus a random Initialization Vector.
 * @see https://github.com/JamesMGreene/node-aes256
 *
 * @param {Buffer} key  A passphrase of any length to used to generate a symmetric session key.
 * @param {Buffer} data  The clear-text message or buffer to be encrypted.
 * @param {(lengthOfBytes: number) => Buffer} rng Initialization vector generator, default using `crypto` or browserify `random-bytes` package
 * @returns {Buffer}
 */
function encrypt (key: Buffer, data: Buffer, rng?: (lengthOfBytes: number) => Buffer): Buffer {
  const sha256 = SHA256(key)
  const initVector = rng === undefined ? randomBytes(16) : rng(16)

  if (initVector.length !== 16) {
    throw new Error('Initialization vector must be 16 bytes long')
  }
  const cipher = aes.createCipheriv(CIPHER_ALGORITHM, sha256, initVector)
  const ciphertext = cipher.update(data)
  return Buffer.concat([initVector, ciphertext, cipher.final()])
}

/**
 * Decrypt an encrypted message back to clear-text using AES-256 plus a random Initialization Vector.
 * @see https://github.com/JamesMGreene/node-aes256
 *
 * @param {Buffer} key A passphrase of any length to used to generate a symmetric session key.
 * @param {Buffer} encrypted The encrypted message to be decrypted.
 * @returns {Buffer} The original plain-text message or buffer.
 */
function decrypt (key: Buffer, encrypted: Buffer): Buffer {
  if (encrypted.length < 17) {
    throw new Error('Provided "encrypted" must decrypt to a non-empty string or buffer')
  }

  const sha256 = SHA256(key)
  const initVector = encrypted.slice(0, 16)
  const decipher = aes.createDecipheriv(CIPHER_ALGORITHM, sha256, initVector)

  const ciphertext = encrypted.slice(16)
  const deciphered = decipher.update(ciphertext)
  const decipherFinal = decipher.final()
  return Buffer.concat([deciphered, decipherFinal])
}

export const AES256 = {
  encrypt,
  decrypt
}
