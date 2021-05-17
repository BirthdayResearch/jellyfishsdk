import bs58 from 'bs58'
import { SHA256, HASH160 } from './hash'

export interface DecodedB58 {
  buffer: Buffer
  prefix: number
}

function _checksum (twentyOneBytes: Buffer): Buffer {
  return SHA256(SHA256(twentyOneBytes)).slice(0, 4)
}

/**
 * Decode a base58 address into 20 bytes data, for p2pkh and p2sh use
 * @param {string} base58 33 to 35 characters string (utf8)
 * @returns {DecodedB58} 20 bytes data + 1 byte prefix
 */
function toHash160 (base58: string): DecodedB58 {
  const buffer = bs58.decode(base58)
  if (buffer.length !== 25) {
    throw new Error('InvalidBase58Address')
  }

  const withPrefix = buffer.slice(0, 21)
  const checksum = buffer.slice(21, 25)

  const expectedChecksum = _checksum(withPrefix)
  if (checksum.compare(expectedChecksum) !== 0) {
    throw new Error('InvalidBase58Address')
  }

  return {
    prefix: withPrefix[0],
    buffer: withPrefix.slice(1, 21)
  }
}

/**
 * To create Base58 address using 20 bytes data + prefix, for p2pkh and p2sh use
 * @param {Buffer|string} data 20 bytes Buffer or 40 characters string
 * @param {number} prefix max = 255 = 1 byte
 * @returns Base58 address (in utf8)
 */
function fromHash160 (data: string | Buffer, prefix: number): string {
  if (typeof data === 'string') {
    if (data.length !== 40) {
      throw new Error('InvalidDataLength')
    }
  } else {
    if (data.length !== 20) {
      throw new Error('InvalidDataLength')
    }
  }

  if (prefix > 255) {
    throw new Error('InvalidVersionPrefix')
  }

  const buffer = typeof data === 'string' ? Buffer.from(data, 'hex') : data
  const withPrefix = Buffer.from([prefix, ...buffer])
  const checksum = _checksum(withPrefix)
  return bs58.encode(Buffer.from([...withPrefix, ...checksum]))
}

/**
 * To create Base58 address using a raw 33 bytes (compressed) public key, for p2pkh and p2sh use
 * @param {Buffer} pubKey 33 bytes long public key
 * @param {number} prefix max = 255 = 1 byte
 * @returns {string} base58 encoded string
 */
function fromPubKey (pubKey: Buffer, prefix: number): string {
  if (pubKey.length !== 33) {
    throw new Error('InvalidPubKeyLength')
  }

  if (prefix > 255) {
    throw new Error('InvalidVersionPrefix')
  }

  const hash = HASH160(pubKey)
  return fromHash160(hash, prefix)
}

export const Bs58 = {
  toHash160,
  fromPubKey,
  fromHash160
}
