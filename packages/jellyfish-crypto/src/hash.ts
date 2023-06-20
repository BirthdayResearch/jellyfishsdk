import createHash from 'create-hash'
import createKeccakHash from 'keccak'

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
 * @param {Buffer} buffer to KECCAK256(buffer)
 */
export function KECCAK256 (buffer: Buffer): Buffer {
  return createKeccakHash('keccak256').update(buffer).digest()
}
