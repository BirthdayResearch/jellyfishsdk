import { SmartBuffer } from 'smart-buffer'
import { readVarUInt } from '../../src/buffer/buffer_varuint'

/**
 *
 * @param {SmartBuffer} buffer
 */
export function readBoolean (buffer: SmartBuffer): boolean {
  const length = readVarUInt(buffer)
  return length > 0
}

export function writeBoolean (value: boolean, buffer: SmartBuffer): void {
  console.log('toBuffer')
  var v = value ? 1 : 0
  const buff = Buffer.from([v])
  buffer.writeBuffer(buff)
}
