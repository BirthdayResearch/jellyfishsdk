import scrypt from 'scrypt-js'

/**
 * The scrypt password-base key derivation function (pbkdf) is an algorithm designed to be brute-force resistant that
 * converts human readable passwords into fixed length arrays of bytes, which can then be used as a key for symmetric
 * block ciphers, private keys, et cetera.
 *
 * This implementation is an adapter for https://github.com/ricmoo/scrypt-js implementation.
 */
export class Scrypt {
  /**
   * @param {number} N the CPU/memory cost; increasing this increases the overall difficulty
   * @param {number} r the block size; increasing this increases the dependency on memory latency and bandwidth
   * @param {number} p the parallelization cost; increasing this increases the dependency on multi-processing
   */
  constructor (
    private readonly N: number = 16384,
    private readonly r: number = 8,
    private readonly p: number = 1
  ) {
  }

  /**
   * Derive a specific length buffer via Scrypt implementation
   * Recommended (by bip38) to serve as an private key encryption key
   *
   * @param {string} passphrase utf8 string
   * @param {Buffer} salt
   * @param {number} keyLength desired output buffer length
   * @returns {Buffer}
   */
  async derive (passphrase: string, salt: Buffer, keyLength: number): Promise<Buffer> {
    const secret = Buffer.from(passphrase.normalize('NFKC'), 'utf8')

    const array = await scrypt.scrypt(
      secret,
      salt,
      this.N,
      this.r,
      this.p,
      keyLength
    )

    return Buffer.from(array)
  }
}
