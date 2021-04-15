import createHash from 'create-hash'

/**
 * @param buffer to RIPEMD160(buffer)
 */
export function RIPEMD160 (buffer: Buffer): Buffer {
  return createHash('rmd160').update(buffer).digest()
}

/**
 * @param buffer to SHA256(buffer)
 */
export function SHA256 (buffer: Buffer): Buffer {
  return createHash('sha256').update(buffer).digest()
}

/**
 * @param buffer to RIPEMD160(SHA256(buffer))
 */
export function HASH160 (buffer: Buffer): Buffer {
  return RIPEMD160(SHA256(buffer))
}

/**
 * @param buffer to SHA256(SHA256(buffer))
 */
export function dSHA256 (buffer: Buffer): Buffer {
  return SHA256(SHA256(buffer))
}
