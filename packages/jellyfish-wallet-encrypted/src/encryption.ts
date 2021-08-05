import randomBytes from 'randombytes'
import { AES256, dSHA256 } from '@defichain/jellyfish-crypto'
import { Scrypt } from './scrypt'

export class EncryptedData {
  /**
   * Total = 7 + 2n bytes
   *
   * @param {number} prefix - 0x01
   * @param {number} type - 0x42 or 0x43 (only 0x42 for now)
   * @param {number} flags - 1 byte (only true for 2 most significant bit for now)
   * @param {Buffer} hash - 4 bytes, checksum and salt
   * @param {Buffer} encryptedFirstHalf - n bytes
   * @param {Buffer} encryptedSecondHalf - n bytes
   */
  constructor (
    readonly prefix: number,
    readonly type: number,
    readonly flags: number,
    readonly hash: Buffer,
    readonly encryptedFirstHalf: Buffer,
    readonly encryptedSecondHalf: Buffer
  ) {
    if (encryptedFirstHalf.length !== encryptedSecondHalf.length) {
      throw new Error('Unexpected data size, first and second half should have same length')
    }
  }

  encode (): string {
    const first3Bytes = Buffer.from([this.prefix, this.type, this.flags]).toString('hex')
    return first3Bytes +
      this.hash.toString('hex') +
      this.encryptedFirstHalf.toString('hex') +
      this.encryptedSecondHalf.toString('hex')
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

export class PrivateKeyEncryption {
  /**
   * @param {Scrypt} scrypt to convert a utf8 string into a secret, cryptographically secured
   * @param {(lengthOfBytes: number) => Buffer} rng for initialization vector generator, default using `crypto` or browserify `random-bytes` package where it may not be supported in platforms like rn
   */
  constructor (
    private readonly scrypt: Scrypt = new Scrypt(),
    private readonly rng: (lengthOfBytes: number) => Buffer = randomBytes
  ) {
  }

  /**
   * To encrypt `data` with a `passphrase` derived secret (derivation based on provided `ScryptProvider`)
   * @see https://github.com/bitcoin/bips/blob/master/bip-0038.mediawiki#Encryption_when_EC_multiply_flag_is_not_used for encryption methodology
   *
   * @param {Buffer} data data with even number length
   * @param {string} passphrase to derived encryption secret, utf8 string in normalization format C
   */
  async encrypt (data: Buffer, passphrase: string): Promise<EncryptedData> {
    if (data.length % 2 !== 0) {
      throw new Error('Data length must be even number')
    }

    const hash = dSHA256(data).slice(0, 4)
    const key = await this.scrypt.derive(passphrase, hash, 64)

    const k1a = Buffer.from(key.toString('hex').slice(0, 32), 'hex') // 16 bytes
    const k1b = Buffer.from(key.toString('hex').slice(32, 64), 'hex') // 16 bytes
    const k2 = Buffer.from(key.toString('hex').slice(64), 'hex') // 32 bytes

    const d1 = Buffer.from(data.toString('hex').slice(0, data.length), 'hex')
    const d2 = Buffer.from(data.toString('hex').slice(data.length), 'hex')

    const xor1 = _xor(k1a, d1)
    const xor2 = _xor(k1b, d2)

    const b1 = AES256.encrypt(k2, xor1, this.rng)
    const b2 = AES256.encrypt(k2, xor2, this.rng)

    return new EncryptedData(0x01, 0x42, 0xc0, hash, b1, b2)
  }

  /**
   * To decrypt raw data
   *
   * @param {string} encrypted to decrypt
   * @param {string} passphrase to decrypted data, utf8 string in normalization format C
   * @returns {Promise<Buffer>} null if no data found in storage
   * @throws Error InvalidPassphrase if passphrase is invalid (decrypted value has no matching hash)
   */
  async decrypt (encrypted: string, passphrase: string): Promise<Buffer> {
    const data = EncryptedData.decode(encrypted)
    const key = await this.scrypt.derive(passphrase, data.hash, 64)

    const k1a = Buffer.from(key.toString('hex').slice(0, 32), 'hex') // 16 bytes
    const k1b = Buffer.from(key.toString('hex').slice(32, 64), 'hex') // 16 bytes
    const k2 = Buffer.from(key.toString('hex').slice(64), 'hex') // 32 bytes

    const dec1 = AES256.decrypt(k2, data.encryptedFirstHalf) // 16 bytes = decipher(32 bytes) - salt
    const dec2 = AES256.decrypt(k2, data.encryptedSecondHalf)

    const d1 = _xor(k1a, dec1)
    const d2 = _xor(k1b, dec2)
    const decrypted = Buffer.from([...d1, ...d2])

    const dataHash = dSHA256(decrypted).slice(0, 4)
    if (dataHash.toString('hex') !== data.hash.toString('hex')) {
      throw new Error('invalid hash')
    }

    return decrypted
  }
}

function _xor (key: Buffer, data: Buffer): Buffer {
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
