import { SmartBuffer } from 'smart-buffer'
import { readVarUInt } from '../../src/buffer/buffer_varuint'

/**
 * @param {SmartBuffer} buffer
 * @return {boolean}
 */
export function readBoolean (buffer: SmartBuffer): boolean {
  const length = readVarUInt(buffer)
  return length > 0
}

/**
 * @param {boolean} value
 * @param {SmartBuffer} buffer
 */
export function writeBoolean (value: boolean, buffer: SmartBuffer): void {
  var v = value.toString().toLowerCase() === 'true' ? 1 : 0
  const buff = Buffer.from([v])
  buffer.writeBuffer(buff)
}
