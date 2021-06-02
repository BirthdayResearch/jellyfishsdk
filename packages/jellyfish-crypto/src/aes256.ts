import crypto from 'crypto'

const CIPHER_ALGORITHM = 'aes-256-ctr'

/**
 * Encrypt a clear-text message using AES-256 plus a random Initialization Vector.
 * @param {Buffer} key  A passphrase of any length to used to generate a symmetric session key.
 * @param {Buffer} data  The clear-text message or buffer to be encrypted.
 * @returns {Buffer}
 */
function encrypt (key: Buffer, data: Buffer): Buffer {
  const sha256 = crypto.createHash('sha256')
  sha256.update(key)

  const iv = crypto.randomBytes(16)
  console.log('enc iv', iv.toString('hex'))
  const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, sha256.digest(), iv)
  const ciphertext = cipher.update(data)
  return Buffer.concat([iv, ciphertext, cipher.final()])
}

/**
 * Decrypt an encrypted message back to clear-text using AES-256 plus a random Initialization Vector.
 * @param {String} key  A passphrase of any length to used to generate a symmetric session key.
 * @param {String|Buffer} encrypted  The encrypted message to be decrypted.
 * @returns {String|Buffer} The original plain-text message or buffer.
 */
function decrypt (key: Buffer, encrypted: Buffer): Buffer {
  if (encrypted.length < 17) {
    throw new Error('Provided "encrypted" must decrypt to a non-empty string or buffer')
  }

  const sha256 = crypto.createHash('sha256')
  sha256.update(key)

  // Initialization Vector
  const iv = encrypted.slice(0, 16)
  const decipher = crypto.createDecipheriv(CIPHER_ALGORITHM, sha256.digest(), iv)

  const ciphertext = encrypted.slice(16)
  const deciphered = decipher.update(ciphertext)
  const decipherFinal = decipher.final()
  return Buffer.concat([deciphered, decipherFinal])
}

export const Aes256 = {
  encrypt,
  decrypt
}
