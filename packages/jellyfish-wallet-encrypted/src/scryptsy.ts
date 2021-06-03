import scrypt from 'scryptsy'
import { ScryptProvider } from './scrypt-storage'

const BIP38_SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 8
}

export class SimpleScryptsy implements ScryptProvider {
  passphraseToKey (passphrase: string, salt: Buffer, keyLength: number): Buffer {
    const secret = Buffer.from(passphrase.normalize('NFC'), 'utf8')
    return scrypt(
      secret,
      salt,
      BIP38_SCRYPT_PARAMS.N,
      BIP38_SCRYPT_PARAMS.r,
      BIP38_SCRYPT_PARAMS.p,
      keyLength
    )
  }
}
