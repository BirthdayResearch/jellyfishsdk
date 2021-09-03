import { SmartBuffer } from 'smart-buffer'

/**
 * @param {number} num to write as VarUInt (1-9 bytes)
 * @param {SmartBuffer} buffer to write to
 */
export function writeVarUInt (num: number, buffer: SmartBuffer): void {
  validateUInt53(num)

  // 8 bit (1 byte)
  if (num < 0xfd) {
    buffer.writeUInt8(num)
    return
  }

  // 16 bit (1 + 2 bytes)
  if (num <= 0xffff) {
    buffer.writeUInt8(0xfd)
    buffer.writeUInt16LE(num)
    return
  }

  // 32 bit (1 + 4 bytes)
  if (num <= 0xffffffff) {
    buffer.writeUInt8(0xfe)
    buffer.writeUInt32LE(num)
    return
  }

  // 64 bit (1 + 8 bytes)
  buffer.writeUInt8(0xff)
  buffer.writeUInt32LE(num >>> 0)
  buffer.writeUInt32LE((num / 0x100000000) | 0)
}

/**
 * Read VarUInt as number
 * @param {SmartBuffer} buffer to read VarUInt from (1-9 bytes)
 * @throws RangeError 'out of Number.MAX_SAFE_INTEGER range' when it's out of MAX_SAFE_INTEGER
 */
export function readVarUInt (buffer: SmartBuffer): number {
  const first = buffer.readUInt8()
  switch (first) {
    case 0xfd: // 16 bit (1 + 2 bytes)
      return buffer.readUInt16LE()
    case 0xfe: // 32 bit (1 + 4 bytes)
      return buffer.readUInt32LE()
    case 0xff: { // 64 bit (1 + 8 bytes)
      const lo = buffer.readUInt32LE()
      const hi = buffer.readUInt32LE()
      const num = (hi * 0x0100000000) + lo
      validateUInt53(num)
      return num
    }
    default: // 8 bit (1 byte)
      return first
  }
}

/**
 * @param {number} num to get total number bytes (1-9 bytes)
 */
export function byteLength (num: number): number {
  validateUInt53(num)
  return num < 0xfd ? 1 : num <= 0xffff ? 3 : num <= 0xffffffff ? 5 : 9
}

/**
 * @param {number} num to validate
 * @throws RangeError 'out of Number.MAX_SAFE_INTEGER range' when it's out of MAX_SAFE_INTEGER
 */
function validateUInt53 (num: number): void {
  if (num < 0 || num > Number.MAX_SAFE_INTEGER || num % 1 !== 0) {
    throw new RangeError('out of Number.MAX_SAFE_INTEGER range')
  }
}
