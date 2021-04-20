import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { writeVarUInt, readVarUInt } from './buffer_varuint'

const ONE_HUNDRED_MILLION = new BigNumber('100000000')

export interface BufferComposer {
  fromBuffer: (buffer: SmartBuffer) => void
  toBuffer: (buffer: SmartBuffer) => void
}

/**
 * A highly composable buffer, by defining a list of composer, it allows bi-directional buffer to object serialization.
 * In short, you compose from a Buffer to Object or an Object to a Buffer. Little endian by design.
 *
 * It is also deeply recursive by default allow cascading object composing.
 */
export abstract class ComposableBuffer<T> implements BufferComposer {
  protected readonly data: T

  abstract composers (data: T): BufferComposer[]

  /**
   * @param data to create ComposableBuffer holder, nothing is done/composed yet.
   */
  constructor (data: T)

  /**
   * @param buffer to compose into Object
   */
  constructor (buffer: SmartBuffer)

  /**
   * For typescript type checking
   */
  constructor (data: SmartBuffer | T)

  constructor (data: SmartBuffer | T) {
    if (data instanceof SmartBuffer) {
      // @ts-expect-error as data will be mapped by fromBuffer()
      this.data = {}
      this.fromBuffer(data)
    } else {
      this.data = data
    }
  }

  fromBuffer (buffer: SmartBuffer): void {
    for (const mapping of this.composers(this.data)) {
      mapping.fromBuffer(buffer)
    }
  }

  toBuffer (buffer: SmartBuffer): void {
    for (const mapping of this.composers(this.data)) {
      mapping.toBuffer(buffer)
    }
  }

  /**
   * Deeply toObject() mapper.
   * This unwrap the data in ComposableBuffer and convert all ComposableBuffer into their raw object.
   * This make it compatible to convert into JSON with JSON.stringify()
   * @return {Object}
   */
  toObject (): any {
    function toObject (value: any): any {
      if (value instanceof ComposableBuffer) {
        return value.toObject()
      }
      if (Array.isArray(value) && value.length > 0) {
        return value.map(v => toObject(v))
      }
      return value
    }

    const json: any = {}
    for (const [key, value] of Object.entries(this.data)) {
      json[key] = toObject(value)
    }
    return json
  }

  /**
   * @return BufferComposer that does nothing
   */
  static empty (): BufferComposer {
    return {
      fromBuffer (buffer: SmartBuffer): void {
      },
      toBuffer (buffer: SmartBuffer): void {
      }
    }
  }

  /**
   * The length of the array is set with VarUInt in the first sequence of 1 - 9 bytes.
   *
   * @param getter to read array of ComposableBuffer Object from to buffer
   * @param setter to set array of ComposableBuffer Object from buffer
   * @param asC map single object into ComposableBuffer Object
   *
   * @see array if length is not given but known
   */
  static varUIntArray<T> (
    getter: () => T[],
    setter: (data: T[]) => void,
    asC: (data: SmartBuffer | T) => ComposableBuffer<T>
  ): BufferComposer {
    return {
      fromBuffer: (buffer: SmartBuffer): void => {
        const length = readVarUInt(buffer)
        const array: T[] = []
        for (let i = 0; i < length; i++) {
          array.push(asC(buffer).data)
        }
        setter(array)
      },
      toBuffer: (buffer: SmartBuffer): void => {
        const array = getter()
        writeVarUInt(array.length, buffer)
        array.forEach(data => asC(data).toBuffer(buffer))
      }
    }
  }

  /**
   * The length of the array must be known and given to the composer, use varUIntArray if length is set as VarUInt.
   *
   * @param getter to read array of ComposableBuffer Object from to buffer
   * @param setter to set array of ComposableBuffer Object from buffer
   * @param asC map single object into ComposableBuffer Object
   * @param getLength of the array
   *
   * @see use varUIntArray if length is set as VarUInt
   */
  static array<T> (
    getter: () => T[],
    setter: (data: T[]) => void,
    asC: (data: SmartBuffer | T) => ComposableBuffer<T>,
    getLength: () => number
  ): BufferComposer {
    return {
      fromBuffer: (buffer: SmartBuffer): void => {
        const array: T[] = []
        for (let i = 0; i < getLength(); i++) {
          array.push(asC(buffer).data)
        }
        setter(array)
      },
      toBuffer: (buffer: SmartBuffer): void => {
        const array = getter()
        array.forEach(data => asC(data).toBuffer(buffer))
      }
    }
  }

  /**
   * The length depends on the Composable buffer composer configuration
   *
   * @param getter to read single ComposableBuffer Object from to buffer
   * @param setter to set single ComposableBuffer Object from buffer
   * @param asC map object into ComposableBuffer Object
   */
  static single<T> (
    getter: () => T,
    setter: (data: T) => void,
    asC: (data: SmartBuffer | T) => ComposableBuffer<T>
  ): BufferComposer {
    return {
      fromBuffer: (buffer: SmartBuffer): void => {
        setter(asC(buffer).data)
      },
      toBuffer: (buffer: SmartBuffer): void => {
        asC(getter()).toBuffer(buffer)
      }
    }
  }

  /**
   * Read/write as little endian, set/get as little endian.
   *
   * @param length of the bytes to read/set
   * @param getter to read hex from to buffer
   * @param setter to set to hex from buffer
   * @throws Error if length != getter().length in set
   */
  static hex (length: number, getter: () => string, setter: (data: string) => void): BufferComposer {
    return {
      fromBuffer: (buffer: SmartBuffer): void => {
        const buff = Buffer.from(buffer.readBuffer(length))
        setter(buff.toString('hex'))
      },
      toBuffer: (buffer: SmartBuffer): void => {
        const hex = getter()
        if (hex.length !== length * 2) {
          throw new Error('ComposableBuffer.hex.toBuffer invalid as length != getter().length')
        }
        const buff: Buffer = Buffer.from(hex, 'hex')
        buffer.writeBuffer(buff)
      }
    }
  }

  /**
   * Unsigned Int8, 1 byte
   *
   * @param getter to read from to buffer
   * @param setter to set to from buffer
   */
  static uInt8 (getter: () => number, setter: (data: number) => any): BufferComposer {
    return {
      fromBuffer: (buffer: SmartBuffer): void => {
        setter(buffer.readUInt8())
      },
      toBuffer: (buffer: SmartBuffer): void => {
        buffer.writeUInt8(getter())
      }
    }
  }

  /**
   * Unsigned Int16, 2 bytes
   *
   * @param getter to read from to buffer
   * @param setter to set to from buffer
   */
  static uInt16 (getter: () => number, setter: (data: number) => void): BufferComposer {
    return {
      fromBuffer: (buffer: SmartBuffer): void => {
        setter(buffer.readUInt16LE())
      },
      toBuffer: (buffer: SmartBuffer): void => {
        buffer.writeUInt16LE(getter())
      }
    }
  }

  /**
   * Signed Int32, 4 bytes
   *
   * @param getter to read from to buffer
   * @param setter to set to from buffer
   */
  static int32 (getter: () => number, setter: (data: number) => void): BufferComposer {
    return {
      fromBuffer: (buffer: SmartBuffer): void => {
        setter(buffer.readInt32LE())
      },
      toBuffer: (buffer: SmartBuffer): void => {
        buffer.writeInt32LE(getter())
      }
    }
  }

  /**
   * Unsigned Int32, 4 bytes
   *
   * @param getter to read from to buffer
   * @param setter to set to from buffer
   */
  static uInt32 (getter: () => number, setter: (data: number) => void): BufferComposer {
    return {
      fromBuffer: (buffer: SmartBuffer): void => {
        setter(buffer.readUInt32LE())
      },
      toBuffer: (buffer: SmartBuffer): void => {
        buffer.writeUInt32LE(getter())
      }
    }
  }

  /**
   * Unsigned BigInt, 8 bytes
   *
   * @param getter to read from to buffer
   * @param setter to set to from buffer
   */
  static bigUInt64 (getter: () => BigInt, setter: (data: BigInt) => void): BufferComposer {
    return {
      fromBuffer: (buffer: SmartBuffer): void => {
        setter(buffer.readBigUInt64LE())
      },
      toBuffer: (buffer: SmartBuffer): void => {
        buffer.writeBigUInt64LE(getter().valueOf())
      }
    }
  }

  /**
   * Unsigned bigint/satoshi as BigNumber, 8 bytes
   * BigNumber is multiplied/divided by 100,000,000
   *
   * @param getter to read from to buffer
   * @param setter to set to from buffer
   */
  static satoshiAsBigNumber (getter: () => BigNumber, setter: (data: BigNumber) => void): BufferComposer {
    return ComposableBuffer.bigUInt64(() => {
      const number = getter().multipliedBy(ONE_HUNDRED_MILLION).toString(10)
      return BigInt(number)
    }, v => {
      const number = new BigNumber(v.toString()).dividedBy(ONE_HUNDRED_MILLION)
      setter(number)
    })
  }

  /**
   * VarUInt helper method, 1 - 9 bytes
   *
   * @param getter to read from to buffer
   * @param setter to set to from buffer
   */
  static varUInt (getter: () => number, setter: (data: number) => void): BufferComposer {
    return {
      fromBuffer: (buffer: SmartBuffer): void => {
        setter(readVarUInt(buffer))
      },
      toBuffer: (buffer: SmartBuffer): void => {
        writeVarUInt(getter(), buffer)
      }
    }
  }
}
