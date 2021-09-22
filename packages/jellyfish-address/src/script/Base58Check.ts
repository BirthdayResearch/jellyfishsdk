import { SHA256 } from '@defichain/jellyfish-crypto'
import bs58 from 'bs58'

/**
 * @param {Buffer} bytes 21 bytes
 */
function _checksum (bytes: Buffer): Buffer {
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
    throw new Error('Base58Check buffer length must be 20')
  }

  const prefixed = Buffer.from([
    ...Buffer.alloc(1, prefix),
    ...buffer
  ])
  const prefixedChecked = Buffer.from([
    ...prefixed,
    ..._checksum(prefixed)
  ])
  return bs58.encode(prefixedChecked)
}

export interface DecodedBase58Check {
  buffer: Buffer
  prefix: number
}

export function fromBase58Check (address: string): DecodedBase58Check {
  const buffer = bs58.decode(address)
  if (buffer.length !== 25) {
    throw new Error('Invalid Base58Check address, length != 25')
  }

  const prefixed = buffer.slice(0, 21)
  const checksum = buffer.slice(21, 25)

  const expectedChecksum = _checksum(prefixed)
  if (checksum.compare(expectedChecksum) !== 0) {
    throw new Error('Invalid Base58Check address, checksum invalid')
  }

  return {
    prefix: prefixed[0],
    buffer: prefixed.slice(1, 21)
  }
}
