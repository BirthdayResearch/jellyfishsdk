import scrypt from 'scryptsy'
import { ScryptProvider } from './scrypt-storage'

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
  readonly scryptParams: ScryptParams
  constructor (scryptParams?: ScryptParams) {
    this.scryptParams = scryptParams !== undefined ? scryptParams : DEFAULT_SCRYPT_PARAMS
  }

  passphraseToKey (passphrase: string, salt: Buffer, keyLength: number): Buffer {
    const secret = Buffer.from(passphrase.normalize('NFC'), 'utf8')
    return scrypt(
      secret,
      salt,
      this.scryptParams.N,
      this.scryptParams.r,
      this.scryptParams.p,
      keyLength
    )
  }
}
