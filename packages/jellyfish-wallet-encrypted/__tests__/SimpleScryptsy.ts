import scrypt from 'scryptsy'
import { ScryptProvider } from '../src/provider/scrypt_provider'

export interface ScryptParams {
  N: number
  r: number
  p: number
}

const DEFAULT_SCRYPT_PARAMS: ScryptParams = {
  N: 16384,
  r: 8,
  p: 8
}

export class SimpleScryptsy implements ScryptProvider {
  constructor (private readonly params: ScryptParams = DEFAULT_SCRYPT_PARAMS) {
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
  async passphraseToKey (passphrase: string, salt: Buffer, keyLength: number): Promise<Buffer> {
    const secret = Buffer.from(passphrase.normalize('NFC'), 'utf8')

    return scrypt(
      secret,
      salt,
      this.params.N,
      this.params.r,
      this.params.p,
      keyLength
    )
  }
}
