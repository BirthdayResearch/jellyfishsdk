import { SmartBuffer } from 'smart-buffer'
import { readVarUInt } from '../../src/buffer/buffer_varuint'

/**
 *
 * @param {SmartBuffer} buffer
 */
export function readBoolean (buffer: SmartBuffer): boolean {
  const length = readVarUInt(buffer)
  return !(length > 0)
}

export function writeBoolean (value: boolean, buffer: SmartBuffer): void {
  var v = value.toString().toLowerCase() === 'true' ? 0 : 1
  const buff = Buffer.from([v])
  buffer.writeBuffer(buff)
}
