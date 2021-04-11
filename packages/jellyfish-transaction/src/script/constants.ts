import { SmartBuffer } from 'smart-buffer'
import { OPCode, StaticCode } from './opcode'

/**
 * An empty array of bytes is pushed onto the stack.
 * (This is not a no-op: an item is added to the stack.)
 * @see OP_FALSE
 */
export class OP_0 extends StaticCode {
  constructor () {
    super(0x00)
  }

  asm (): string {
    return 'OP_0'
  }
}

/**
 * An empty array of bytes is pushed onto the stack.
 * (This is not a no-op: an item is added to the stack.)
 * @see OP_0
 */
export class OP_FALSE extends OP_0 {
  asm (): string {
    return 'OP_FALSE'
  }
}

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
  protected readonly data: Buffer

  constructor (buffer: Buffer)

  constructor (code: number, buffer: SmartBuffer)

  constructor (numOrBuffer: number | Buffer, buffer?: SmartBuffer) {
    super()
    if (Buffer.isBuffer(numOrBuffer)) {
      this.data = numOrBuffer
    } else if (buffer !== undefined) {
      const buff = OP_PUSHDATA.readData(numOrBuffer, buffer)
      this.data = Buffer.from(buff).reverse()
    } else {
      throw new Error('OP_PUSHDATA invalid constructor parameters')
    }
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

  asBuffer (): Buffer {
    const len = this.data.length
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

    buffer.writeBuffer(this.data.reverse())
    return buffer.toBuffer()
  }

  /**
   * Push Data ASM is the bytes itself in hex
   */
  asm (): string {
    return this.data.toString('hex')
  }
}
