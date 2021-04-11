import { SmartBuffer } from 'smart-buffer'
import { readVarUInt, writeVarUInt } from '../buffer/buffer_varuint'
import { OP_PUSHDATA } from './constants'
import { numAsOPCode } from './static'

/**
 * Operation code, script words, opcodes, commands and functions there are many names to this.
 * This is essentially things to be pushed into the DeFi scripting stack.
 *
 * Like bitcoin, it uses a scripting system for transactions.
 * Script is simple, stack-based, and processed from left to right.
 * It is intentionally none Turing-complete, with no loops.
 *
 * In jellyfish-transaction, this stack scripting is implemented as class for first class type support.
 * This allows instanceof assertions and wraps all data to be pushed into a stack as a an instantiatable object.
 */
export abstract class OPCode {
  abstract asm (): string

  abstract asBuffer (): Buffer

  static fromBuffer (buffer: SmartBuffer): OPCode[] {
    const length = readVarUInt(buffer)
    if (length === 0) {
      return []
    }

    return this.toOPCodes(SmartBuffer.fromBuffer(buffer.readBuffer(length)))
  }

  private static toOPCodes (buffer: SmartBuffer): OPCode[] {
    const stack: OPCode[] = []
    while (buffer.remaining() > 0) {
      stack.push(this.toOpCode(buffer))
    }
    return stack
  }

  private static toOpCode (buffer: SmartBuffer): OPCode {
    const code = buffer.readUInt8()

    if (code !== 0x00 && code <= 0x4e) {
      return new OP_PUSHDATA(code, buffer)
    }

    return numAsOPCode(code)
  }

  static toBuffer (stack: OPCode[], buffer: SmartBuffer): void {
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
}
