import { SmartBuffer } from 'smart-buffer'
import { readVarUInt, writeVarUInt } from '../buffer/buffer_varuint'
import { OPCode } from './opcode'
import { numAsOPCode } from './mapping'
import { OP_PUSHDATA } from './data'
import { remapDeFiScript } from './defi'

export * from './bitwise'
export * from './constants'
export * from './control'
export * from './crypto'
export * from './data'
export * from './mapping'
export * from './opcode'
export * from './stack'

// TODO(fuxingloh): refactor away default

export default {
  /**
   * Read SmartBuffer and create OPCode[] stack.
   *
   * Using P2WPKH redeem script as an example.
   *
   * Input Example: 1600140e7c0ab18b305bc987a266dc06de26fcfab4b56a
   *   0x16 (VarUInt)
   *   0x00 (OP_0)
   *   6ab5b4fafc26de06dc66a287c95b308bb10a7c0e (formatted as big endian)
   *
   * Output Example:
   *   OP_0
   *   OP_PUSHDATA<RIPEMD160(SHA256(pubkey))>
   *
   * @param buffer {SmartBuffer} to read from
   * @return {OPCode[]} read from buffer to OPCode
   */
  fromBufferToOpCodes (buffer: SmartBuffer): OPCode[] {
    const length = readVarUInt(buffer)
    if (length === 0) {
      return []
    }

    return toOPCodes(SmartBuffer.fromBuffer(buffer.readBuffer(length)))
  },
  /**
   * Converts OPCode[] and write it into SmartBuffer.
   *
   * Using P2PKH redeem script as an example.
   *
   * Input Example:
   *   OP_DUP
   *   OP_HASH160
   *   OP_PUSHDATA<RIPEMD160(SHA256(pubkey))>
   *   OP_EQUALVERIFY
   *   OP_CHECKSIG
   *
   * Output Example: 1976a9143bde42dbee7e4dbe6a21b2d50ce2f0167faa815988ac
   *   0x19 (VarUInt)
   *   0x76 (OP_DUP)
   *   0xa9 (OP_HASH160)
   *   5981aa7f16f0e20cd5b2216abe4d7eeedb42de3b (formatted as big endian)
   *   0x88 (OP_EQUALVERIFY)
   *   0xac (OP_CHECKSIG)
   *
   * @param stack {OPCode[]} to convert into raw buffer
   * @param buffer {SmartBuffer} to write to
   */
  fromOpCodesToBuffer (stack: OPCode[], buffer: SmartBuffer): void {
    const buffs = toBuffer(stack)

    // Write the len of buffer in bytes and then all the buffer
    writeVarUInt(buffs.length, buffer)
    buffer.writeBuffer(buffs)
  }
}

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
