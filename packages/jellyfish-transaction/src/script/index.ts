import { SmartBuffer } from 'smart-buffer'
import { readVarUInt, writeVarUInt } from '../buffer/buffer_varuint'
import { OPCode } from './opcode'
import { OP_PUSHDATA } from './constants'
import { numAsOPCode } from './mapping'

export * from './constants'
export * from './control'
export * from './opcode'
export * from './mapping'

export function fromBuffer (buffer: SmartBuffer): OPCode[] {
  const length = readVarUInt(buffer)
  if (length === 0) {
    return []
  }

  return toOPCodes(SmartBuffer.fromBuffer(buffer.readBuffer(length)))
}

export function toBuffer (stack: OPCode[], buffer: SmartBuffer): void {
  let len = 0
  const buffers = []

  // Collect len of byes and all buffers
  for (const opCode of stack) {
    const buf = opCode.asBuffer()
    len += buf.length
    buffers.push(buf)
  }

  // Write the len of buffer in bytes and then all the buffer
  writeVarUInt(len, buffer)
  for (const buff of buffers) {
    buffer.writeBuffer(buff)
  }
}

function toOPCodes (buffer: SmartBuffer): OPCode[] {
  const stack: OPCode[] = []
  while (buffer.remaining() > 0) {
    stack.push(toOpCode(buffer))
  }
  return stack
}

function toOpCode (buffer: SmartBuffer): OPCode {
  const code = buffer.readUInt8()

  if (code !== 0x00 && code <= 0x4e) {
    return new OP_PUSHDATA(code, buffer)
  }

  return numAsOPCode(code)
}
