import { dSHA256, AES256 } from '../../jellyfish-crypto/dist'

export interface ScryptProvider {
  passphraseToKey: (nfcUtf8: string, salt: Buffer, desiredKeyLen: number) => Buffer
}

export type InitVectorProvider = () => Buffer

export interface Storage {
  getter: () => Promise<string | undefined>
  setter: (encrypted: string | undefined) => Promise<void>
}

export class EncryptedData {
  constructor (
    // total = 7 + 2n bytes
    readonly prefix: number, // 0x01
    readonly type: number, // 0x42 or 0x43 (only 0x42 for now)
    readonly flags: number, // 1 byte (only true for 2 most significant bit for now)
    readonly hash: Buffer, // 4 bytes, checksum and salt
    readonly encryptedFirstHalf: Buffer, // n bytes
    readonly encryptedSecondHalf: Buffer // n bytes
  ) {
    this.prefix = prefix
    this.type = type
    this.flags = flags
    this.hash = hash
    this.encryptedFirstHalf = encryptedFirstHalf
    this.encryptedSecondHalf = encryptedSecondHalf

    if (encryptedFirstHalf.length !== encryptedSecondHalf.length) {
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
  /**
   * @param {ScryptProvider} scryptProvider to convert a utf8 string into a secret, cryptographically secured
   * @param {Storage} encryptedStorage to store encrypted data
   * @param {Storage} hashStorage to store hash of the data, for passphrase verification use
   * @param {InitVectorProvider} ivProvider `() => Buffer` as AES encryption iv randomizer, default = `crypto-js.randomBytes`
   */
  constructor (
    readonly scryptProvider: ScryptProvider,
    readonly encryptedStorage: Storage,
    readonly hashStorage: Storage,
    readonly ivProvider?: InitVectorProvider
  ) {
    this.scryptProvider = scryptProvider
    this.encryptedStorage = encryptedStorage
    this.hashStorage = hashStorage
    this.ivProvider = ivProvider
  }

  /**
   * To encrypt `data` with a `passphrase` derived secret (derivation based on provided `ScryptProvider`)
   * @see https://github.com/bitcoin/bips/blob/master/bip-0038.mediawiki#Encryption_when_EC_multiply_flag_is_not_used for encryption methodology
   *
   * @param {Buffer} data data with even number length
   * @param {string} passphrase to derived encryption secret, utf8 string in normalization format C
   */
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

    const b1 = AES256.encrypt(k2, xor1, this.ivProvider)
    const b2 = AES256.encrypt(k2, xor2, this.ivProvider)

    const encrypted = new EncryptedData(0x01, 0x42, 0xc0, hash, b1, b2)
    await this.encryptedStorage.setter(encrypted.encode())

    const dataHash = dSHA256(data).slice(0, 4)
    await this.hashStorage.setter(dataHash.toString('hex'))
  }

  /**
   * To decrypt raw data
   * @param {string} passphrase to decrypted data, utf8 string in normalization format C
   * @returns {Promise<Buffer|null>} null if no data found in storage
   */
  async decrypt (passphrase: string): Promise<Buffer|null> {
    const encrypted = await this.encryptedStorage.getter()

    if (encrypted === undefined) {
      return null
    }

    const data = EncryptedData.decode(encrypted)
    const key = this.scryptProvider.passphraseToKey(passphrase, data.hash, 64)

    const k1a = Buffer.from(key.toString('hex').slice(0, 32), 'hex') // 16 bytes
    const k1b = Buffer.from(key.toString('hex').slice(32, 64), 'hex') // 16 bytes
    const k2 = Buffer.from(key.toString('hex').slice(64), 'hex') // 32 bytes

    const dec1 = AES256.decrypt(k2, data.encryptedFirstHalf) // 16 bytes = decipher(32 bytes) - salt
    const dec2 = AES256.decrypt(k2, data.encryptedSecondHalf)

    const d1 = this._xor(k1a, dec1)
    const d2 = this._xor(k1b, dec2)
    const decrypted = Buffer.from([...d1, ...d2])

    const dataHash = dSHA256(decrypted).slice(0, 4)
    const expected = await this.hashStorage.getter()
    if (dataHash.toString('hex') !== expected) {
      throw new Error('InvalidPassphrase')
    }

    return decrypted
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
