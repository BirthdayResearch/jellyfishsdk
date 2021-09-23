import { SHA256 } from '@defichain/jellyfish-crypto'
import bs58 from 'bs58'

/**
 * @param {Buffer} bytes 21 bytes
 */
function checksum (bytes: Buffer): Buffer {
  return SHA256(SHA256(bytes)).slice(0, 4)
}

/**
 * Base58 with Checksum for P2SH and P2PKH addresses.
 *
 * @param {Buffer} buffer 20 bytes Buffer (Hash160)
 * @param {number} prefix 1 byte length network prefix
 * @returns string base58check encoded address
 */
export function toBase58Check (buffer: Buffer, prefix: number): string {
  if (buffer.length !== 20) {
    throw new Error('Base buffer length must be either 20')
  }

  const prefixed = Buffer.from([
    ...Buffer.alloc(1, prefix),
    ...buffer
  ])
  const prefixedChecked = Buffer.from([
    ...prefixed,
    ...checksum(prefixed)
  ])
  return bs58.encode(prefixedChecked)
}
