import { keccak256 } from 'js-sha3'
import createHash from 'create-hash'

/**
 * @param {Buffer} buffer to RIPEMD160(buffer)
 */
export function RIPEMD160 (buffer: Buffer): Buffer {
  return createHash('rmd160').update(buffer).digest()
}

/**
 * @param {Buffer} buffer to SHA256(buffer)
 */
export function SHA256 (buffer: Buffer): Buffer {
  return createHash('sha256').update(buffer).digest()
}

/**
 * @param {Buffer} buffer to RIPEMD160(SHA256(buffer))
 */
export function HASH160 (buffer: Buffer): Buffer {
  return RIPEMD160(SHA256(buffer))
}

/**
 * @param {Buffer} buffer to SHA256(SHA256(buffer))
 */
export function dSHA256 (buffer: Buffer): Buffer {
  return SHA256(SHA256(buffer))
}

/**
 * @param {Buffer} buffer to keccak256(buffer)
 */
export function KECCAK256 (buffer: Buffer): string {
  const hash = keccak256(buffer)
  return hash.slice(hash.length - 40) // grab the last 20 bytes (40 chars)
}
