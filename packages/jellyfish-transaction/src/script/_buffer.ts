import { SmartBuffer } from 'smart-buffer'
import { OPCode } from './opcode'
import { numAsOPCode } from './mapping'
import { OP_PUSHDATA } from './data'
import { remapDeFiScript } from './dftx'

/**
 * @param {OPCode[]} stack of OPCode
 * @return Buffer presentation of OPCode[]
 */
export function toBuffer (stack: OPCode[]): Buffer {
  let len = 0
  const buffers = []

  for (const opCode of stack) {
    const buf = opCode.asBuffer()
    buffers.push(buf)
    len += buf.length
  }

  return Buffer.concat(buffers, len)
}

/**
 * @param {Buffer} buffer to read without VarUInt
 * @return OPCode[]
 */
export function toOPCodes (buffer: SmartBuffer): OPCode[] {
  const stack: OPCode[] = []
  while (buffer.remaining() > 0) {
    stack.push(toOpCode(buffer))
  }

  // remap if isDeFiScript to identify DeFi Scripting
  return remapDeFiScript(stack)
}

function toOpCode (buffer: SmartBuffer): OPCode {
  const code = buffer.readUInt8()

  if (code !== 0x00 && code <= 0x4e) {
    return new OP_PUSHDATA(code, buffer)
  }

  return numAsOPCode(code)
}
