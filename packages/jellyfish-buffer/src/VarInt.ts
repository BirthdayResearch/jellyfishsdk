import BN from 'bn.js'
import { SmartBuffer } from 'smart-buffer'

/**
 * Variable-length integers: bytes are a MSB base-128 encoding of the number.
 * The high bit in each byte signifies whether another digit follows. To make
 * sure the encoding is one-to-one, one is subtracted from all but the last digit.
 * Thus, the byte sequence a[] with length len, where all but the last byte
 * has bit 128 set, encodes the number:
 *
 *  (a[len-1] & 0x7F) + sum(i=1..len-1, 128^i*((a[len-i-1] & 0x7F)+1))
 *
 * Properties:
 * * Very small (0-127: 1 byte, 128-16511: 2 bytes, 16512-2113663: 3 bytes)
 * * Every integer has exactly one encoding
 * * Encoding does not depend on size of original integer type
 * * No redundancy: every (infinite) byte sequence corresponds to a list
 *   of encoded integers.
 *
 * 0:         [0x00]  256:        [0x81 0x00]
 * 1:         [0x01]  16383:      [0xFE 0x7F]
 * 127:       [0x7F]  16384:      [0xFF 0x00]
 * 128:  [0x80 0x00]  16511:      [0xFF 0x7F]
 * 255:  [0x80 0x7F]  65535: [0x82 0xFE 0x7F]
 * 2^32:           [0x8E 0xFE 0xFE 0xFF 0x00]
 *
 * @param {number} value to write as variable-length integers
 * @param {SmartBuffer} buffer to write to
 */
export function writeVarInt (value: number, buffer: SmartBuffer): void {
  let n = new BN(value)
  validateMaxSafeInteger(n)

  const tmp = []
  let len = 0

  while (true) {
    tmp[len] = new BN(n.andln(0x7f))
    tmp[len] = tmp[len].addn(len > 0 ? 0x80 : 0x00)
    if (n.cmpn(0x7f) <= 0) {
      break
    }
    n = n.shrn(7)
    n = n.subn(1)
    len++
  }

  do {
    buffer.writeUInt8(tmp[len].toNumber())
  } while (len-- !== 0)
}

/**
 * Read VarInt as number
 *
 * @param {SmartBuffer} buffer to read VarInt from (1-9 bytes)
 * @return {number}
 * @throws RangeError 'out of Number.MAX_SAFE_INTEGER range' when it's out of MAX_SAFE_INTEGER
 */
export function readVarInt (buffer: SmartBuffer): number {
  let n = new BN(0)

  while (true) {
    const buff: number = buffer.readUInt8()
    n = n.shln(7)
    n = n.addn((buff & 0x7f))
    if ((buff & 0x80) !== 0) {
      n = n.addn(1)
    } else {
      validateMaxSafeInteger(n)
      return n.toNumber()
    }
  }
}

const BN_MAX_SAFE_INTEGER = new BN(Number.MAX_SAFE_INTEGER)

function validateMaxSafeInteger (n: BN): void {
  if (n.gt(BN_MAX_SAFE_INTEGER)) {
    throw new RangeError('out of Number.MAX_SAFE_INTEGER range')
  }
}
