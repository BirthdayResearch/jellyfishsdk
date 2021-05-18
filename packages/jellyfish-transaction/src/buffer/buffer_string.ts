import { SmartBuffer } from 'smart-buffer'
import { readVarUInt, writeVarUInt } from '../../src/buffer/buffer_varuint'

/**
 * Read String in big-endian
 *
 * @param {SmartBuffer} buffer
 * @return {string}
 */
export function readStringBE (buffer: SmartBuffer): string {
  const length = readVarUInt(buffer)
  const buff = Buffer.from(buffer.readBuffer(length))
  return buff.toString('utf-8')
}

/**
 * Write String in big-endian
 *
 * @param {string} text
 * @param {SmartBuffer} buffer
 */
export function writeStringBE (text: string, buffer: SmartBuffer): void {
  const buff = Buffer.from(text, 'utf-8')
  writeVarUInt(buff.length, buffer)
  buffer.writeBuffer(buff)
}

/**
 * Read String in little-endian
 *
 * @param {SmartBuffer} buffer
 * @return {string}
 */
export function readStringLE (buffer: SmartBuffer): string {
  const length = readVarUInt(buffer)
  const buff = Buffer.from(buffer.readBuffer(length))
  return buff.reverse().toString('utf-8')
}

/**
 * Write String in little-endian
 *
 * @param {string} text
 * @param {SmartBuffer} buffer
 */
export function writeStringLE (text: string, buffer: SmartBuffer): void {
  const buff = Buffer.from(text, 'utf-8').reverse()
  writeVarUInt(buff.length, buffer)
  buffer.writeBuffer(buff)
}
