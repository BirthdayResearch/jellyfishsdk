import { SmartBuffer } from 'smart-buffer'
import { writeVarUInt, readVarUInt } from './buffer_varuint'

export interface BufferComposer {
  fromBuffer: (buffer: SmartBuffer) => void
  toBuffer: (buffer: SmartBuffer) => void
}

/**
 * A highly composable buffer,
 *
 * Little Endian by default because BITCOIN!
 */
export abstract class ComposableBuffer<T> implements BufferComposer {
  readonly data: T

  abstract composers (data: T): BufferComposer[]

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

  static hex (length: number, getter: () => string, setter: (data: string) => void): BufferComposer {
    return {
      fromBuffer: (buffer: SmartBuffer): void => {
        const buff = Buffer.from(buffer.readBuffer(length))
        setter(buff.reverse().toString('hex'))
      },
      toBuffer: (buffer: SmartBuffer): void => {
        const hex = getter()
        if (hex.length !== length * 2) {
          throw new Error('ComposableBuffer.hex.toBuffer invalid as length != getter().length')
        }
        const buff: Buffer = Buffer.from(hex, 'hex').reverse()
        buffer.writeBuffer(buff)
      }
    }
  }

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
