import { SmartBuffer } from 'smart-buffer'
import { OPCode } from './opcode'

/**
 * These are opcode from 1-75, 76, 77, 78.
 * Effectively this opcode carry data.
 *
 * OP_CODE      | HEX         | DESCRIPTION
 * -------------|-------------|----------------------------------------------------------------------
 * N/A          | 0x01-0x4b   | The next opcode bytes is data to be pushed onto the stack
 * OP_PUSHDATA1 | 0x4c        | The next byte contains the number of bytes to be pushed onto the stack.
 * OP_PUSHDATA2 | 0x4d        | The next 2 bytes contain the number of bytes to be pushed onto the stack in LE order.
 * OP_PUSHDATA4 | 0x4e        | The next 4 bytes contain the number of bytes to be pushed onto the stack in LE order.
 *
 * OPCODE will automatically be appended in asBuffer().
 * The constructor only accepts the bytes to be pushed in the stack.
 */
export class OP_PUSHDATA extends OPCode {
  /**
   * Stored as LITTLE ENDIAN hex string.
   */
  public readonly hex: string

  /**
   * @param buffer {Buffer} raw buffer to create OP_PUSHDATA with
   * @param endian {'little' | 'big'} of the buffer
   */
  constructor (buffer: Buffer, endian: 'little' | 'big')

  /**
   * @param code {number} 0x4c-0x4e for push data
   * @param buffer {SmartBuffer} smart buffer to read from
   */
  constructor (code: number, buffer: SmartBuffer)

  constructor (p1: any, p2: any) {
    super('OP_PUSHDATA')
    if (Buffer.isBuffer(p1) && (p2 === 'little' || p2 === 'big')) {
      if (p2 === 'big') {
        this.hex = Buffer.from(p1).reverse().toString('hex')
      } else {
        this.hex = Buffer.from(p1).toString('hex')
      }
      return
    }

    if (typeof p1 === 'number' && p2 instanceof SmartBuffer) {
      const buff = OP_PUSHDATA.readData(p1, p2)
      this.hex = Buffer.from(buff).toString('hex')
      return
    }

    throw new Error('OP_PUSHDATA invalid constructor parameters')
  }

  /**
   * Read data from buffer
   */
  private static readData (code: number, buffer: SmartBuffer): Buffer {
    if (code < 0x4c) {
      return buffer.readBuffer(code)
    }

    if (code === 0x4c) {
      return buffer.readBuffer(buffer.readUInt8())
    }

    if (code === 0x4d) {
      return buffer.readBuffer(buffer.readUInt16LE())
    }

    if (code === 0x4e) {
      return buffer.readBuffer(buffer.readUInt32LE())
    }

    throw new RangeError(`OP_PUSHDATA ${code} is not between 0x01 or 0x4e inclusive`)
  }

  /**
   * Length of bytes
   */
  length (): number {
    return this.hex.length / 2
  }

  /**
   * @return [0x01-0x4e, [>0x4b ?? length], [push data]]
   */
  asBuffer (): Buffer {
    const len = this.length()
    const buffer = new SmartBuffer()

    if (len < 76) {
      buffer.writeUInt8(len)
    } else if (len <= 255) {
      buffer.writeUInt8(0x4c)
      buffer.writeUInt8(len)
    } else if (len <= 65535) {
      buffer.writeUInt8(0x4d)
      buffer.writeUInt16LE(len)
    } else if (len <= 16777215) {
      buffer.writeUInt8(0x4e)
      buffer.writeUInt32LE(len)
    } else {
      throw new RangeError('OP_PUSHDATA buffer is larger than 16777215')
    }

    buffer.writeString(this.hex, 'hex')
    return buffer.toBuffer()
  }
}
