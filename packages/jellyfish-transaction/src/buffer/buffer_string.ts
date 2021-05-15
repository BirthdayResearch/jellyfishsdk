import { SmartBuffer } from 'smart-buffer'
import { readVarUInt, writeVarUInt } from '../../src/buffer/buffer_varuint'

/**
 *
 * @param {SmartBuffer} buffer
 */
export function readString (buffer: SmartBuffer): string {
  const length = readVarUInt(buffer)
  const buff = Buffer.from(buffer.readBuffer(length))
  return buff.reverse().toString('utf-8')
}

export function writeString (text: string, buffer: SmartBuffer): void {
  const buff = Buffer.from(text, 'utf-8').reverse()
  writeVarUInt(buff.length, buffer)
  buffer.writeBuffer(buff)
}
