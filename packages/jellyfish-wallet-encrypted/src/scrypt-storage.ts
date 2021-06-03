import { dSHA256, Aes256 } from '../../jellyfish-crypto/dist'

export interface ScryptProvider {
  passphraseToKey: (nfcUtf8: string, salt: Buffer, desiredKeyLen: number) => Buffer
}

export interface Storage {
  getter: () => Promise<string | undefined>
  setter: (encrypted: string | undefined) => Promise<void>
}

export class EncryptedData {
  // 71 bytes
  readonly prefix: number // 0x01
  readonly type: number // 0x42 or 0x43

  readonly flags: number // 1 byte
  readonly hash: Buffer // 4 bytes, checksum and salt
  readonly encryptedFirstHalf: Buffer
  readonly encryptedSecondHalf: Buffer

  constructor (prefix: number, type: number, flags: number, hash: Buffer, encrypted1: Buffer, encrypted2: Buffer) {
    this.prefix = prefix
    this.type = type
    this.flags = flags
    this.hash = hash
    this.encryptedFirstHalf = encrypted1
    this.encryptedSecondHalf = encrypted2

    if (encrypted1.length !== encrypted2.length) {
      throw new Error('Unxpected data size, first and second half should have same length')
    }
  }

  encode (): string {
    const first3Bytes = Buffer.from([this.prefix, this.type, this.flags]).toString('hex')
    const full = first3Bytes + this.hash.toString('hex') + this.encryptedFirstHalf.toString('hex') + this.encryptedSecondHalf.toString('hex')
    return full
  }

  static decode (encoded: string): EncryptedData {
    if (encoded.length < 18) { // min length is 9 bytes
      throw new Error('Invalid encrypted data')
    }

    const dataLen = encoded.length - 14
    if (dataLen % 2 !== 0) {
      throw new Error('Invalid encrypted data')
    }

    const firstHalfEndIndex = 14 + (dataLen / 2)
    return new EncryptedData(
      Number(encoded.slice(0, 2)),
      Number(encoded.slice(2, 4)),
      Number(encoded.slice(4, 6)),
      Buffer.from(encoded.slice(6, 14), 'hex'),
      Buffer.from(encoded.slice(14, firstHalfEndIndex), 'hex'),
      Buffer.from(encoded.slice(firstHalfEndIndex), 'hex')
    )
  }
}

export class ScryptStorage {
  readonly scryptProvider: ScryptProvider
  readonly storage: Storage

  constructor (scryptProvider: ScryptProvider, storage: Storage) {
    this.scryptProvider = scryptProvider
    this.storage = storage
  }

  async encrypt (data: Buffer, passphrase: string): Promise<void> {
    if (data.length % 2 !== 0) {
      throw new Error('Data length must be even number')
    }

    const hash = dSHA256(data).slice(0, 4)
    const key = this.scryptProvider.passphraseToKey(passphrase, hash, 64)

    const k1a = Buffer.from(key.toString('hex').slice(0, 32), 'hex') // 16 bytes
    const k1b = Buffer.from(key.toString('hex').slice(32, 64), 'hex') // 16 bytes
    const k2 = Buffer.from(key.toString('hex').slice(64), 'hex') // 32 bytes

    const d1 = Buffer.from(data.toString('hex').slice(0, data.length), 'hex')
    const d2 = Buffer.from(data.toString('hex').slice(data.length), 'hex')

    const xor1 = this._xor(k1a, d1)
    const xor2 = this._xor(k1b, d2)

    const b1 = Aes256.encrypt(k2, xor1)
    const b2 = Aes256.encrypt(k2, xor2)

    const encrypted = new EncryptedData(0x01, 0x42, 0xc0, hash, b1, b2)
    await this.storage.setter(encrypted.encode())
  }

  async decrypt (passphrase: string): Promise<Buffer|null> {
    const encrypted = await this.storage.getter()

    if (encrypted === undefined) {
      return null
    }

    const data = EncryptedData.decode(encrypted)
    const key = this.scryptProvider.passphraseToKey(passphrase, data.hash, 64)

    const k1a = Buffer.from(key.toString('hex').slice(0, 32), 'hex') // 16 bytes
    const k1b = Buffer.from(key.toString('hex').slice(32, 64), 'hex') // 16 bytes
    const k2 = Buffer.from(key.toString('hex').slice(64), 'hex') // 32 bytes

    const dec1 = Aes256.decrypt(k2, data.encryptedFirstHalf) // 16 bytes = decipher(32 bytes) - salt
    const dec2 = Aes256.decrypt(k2, data.encryptedSecondHalf)

    const d1 = this._xor(k1a, dec1)
    const d2 = this._xor(k1b, dec2)
    return Buffer.from([...d1, ...d2])
  }

  private _xor (key: Buffer, data: Buffer): Buffer {
    const output = Buffer.alloc(data.length)
    for (let i = 0, j = 0; i < data.length && i < data.length; i++) {
      output[i] = data[i] ^ key[j]
      if (j + 1 === data.length) {
        j = 0
      } else {
        j++
      }
    }
    return output
  }
}
