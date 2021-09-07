import { SmartBuffer } from 'smart-buffer'
import { byteLength, readVarUInt, writeVarUInt } from '../src/varuint'

it('readBigInt64LE should be equal (readUInt32LE + readUInt32LE * 0x100000000)', () => {
  const buffer = Buffer.allocUnsafe(8)
  buffer.writeUInt32LE(1000)
  buffer.writeUInt32LE(1000, 4)

  const bigInt = buffer.readBigInt64LE()

  const lo = buffer.readUInt32LE()
  const hi = buffer.readUInt32LE(4)
  const num = lo + (hi * 0x100000000)

  expect(bigInt.toString()).toStrictEqual(num.toString())
})

describe('writeVarUInt', () => {
  function shouldWrite (num: number): SmartBuffer {
    const buffer = new SmartBuffer()
    writeVarUInt(num, buffer)
    return buffer
  }

  describe('1 byte', () => {
    it('should read 0', () => {
      const buffer = shouldWrite(0)
      expect(buffer.readUInt8()).toStrictEqual(0)
    })

    it('should read 128', () => {
      const buffer = shouldWrite(128)
      expect(buffer.readUInt8()).toStrictEqual(128)
    })

    it('should read 252', () => {
      const buffer = shouldWrite(252)
      expect(buffer.readUInt8()).toStrictEqual(252)
    })
  })

  describe('3 bytes', () => {
    it('should read 253', () => {
      const buffer = shouldWrite(253)
      expect(buffer.readUInt8()).toStrictEqual(0xfd)
      expect(buffer.readUInt16LE()).toStrictEqual(253)
    })

    it('should read 25000', () => {
      const buffer = shouldWrite(25000)
      expect(buffer.readUInt8()).toStrictEqual(0xfd)
      expect(buffer.readUInt16LE()).toStrictEqual(25000)
    })

    it('should read 65535', () => {
      const buffer = shouldWrite(65535)
      expect(buffer.readUInt8()).toStrictEqual(0xfd)
      expect(buffer.readUInt16LE()).toStrictEqual(65535)
    })
  })

  describe('5 bytes', () => {
    it('should read 65536', () => {
      const buffer = shouldWrite(65536)
      expect(buffer.readUInt8()).toStrictEqual(0xfe)
      expect(buffer.readUInt32LE()).toStrictEqual(65536)
    })

    it('should read 123456789', () => {
      const buffer = shouldWrite(123456789)
      expect(buffer.readUInt8()).toStrictEqual(0xfe)
      expect(buffer.readUInt32LE()).toStrictEqual(123456789)
    })

    it('should read 4294967295', () => {
      const buffer = shouldWrite(4294967295)
      expect(buffer.readUInt8()).toStrictEqual(0xfe)
      expect(buffer.readUInt32LE()).toStrictEqual(4294967295)
    })
  })

  describe('9 bytes', () => {
    it('should read 4294967296', () => {
      const buffer = shouldWrite(4294967296)
      expect(buffer.readUInt8()).toStrictEqual(0xff)
      expect(buffer.readUInt32LE()).toStrictEqual(4294967296 >>> 0)
      expect(buffer.readUInt32LE()).toStrictEqual((4294967296 / 0x100000000) | 0)
    })

    it('should read 5234560000000000', () => {
      const buffer = shouldWrite(5234560000000000)
      expect(buffer.readUInt8()).toStrictEqual(0xff)
      expect(buffer.readUInt32LE()).toStrictEqual(5234560000000000 >>> 0)
      expect(buffer.readUInt32LE()).toStrictEqual((5234560000000000 / 0x100000000) | 0)
    })

    it('should read 9007199254740991', () => {
      const buffer = shouldWrite(9007199254740991)
      expect(buffer.readUInt8()).toStrictEqual(0xff)
      expect(buffer.readUInt32LE()).toStrictEqual(9007199254740991 >>> 0)
      expect(buffer.readUInt32LE()).toStrictEqual((9007199254740991 / 0x100000000) | 0)
    })
  })
})

describe('readVarUInt', () => {
  function shouldRead (num: number, writer: (buffer: SmartBuffer) => void): void {
    const buffer = new SmartBuffer()
    writer(buffer)
    return expect(readVarUInt(buffer)).toStrictEqual(num)
  }

  describe('1 byte', () => {
    it('should read 0', () => {
      shouldRead(0, buffer => {
        buffer.writeUInt8(0)
        buffer.writeUInt8(64)
      })
    })

    it('should read 128', () => {
      shouldRead(128, buffer => {
        buffer.writeUInt8(128)
        buffer.writeUInt8(64)
      })
    })

    it('should read 252', () => {
      shouldRead(252, buffer => {
        buffer.writeUInt8(252)
        buffer.writeUInt8(64)
      })
    })
  })

  describe('3 bytes', () => {
    it('should read 253', () => {
      shouldRead(253, buffer => {
        buffer.writeUInt8(0xfd)
        buffer.writeUInt16LE(253)
        buffer.writeUInt16LE(512)
      })
    })

    it('should read 25000', () => {
      shouldRead(25000, buffer => {
        buffer.writeUInt8(0xfd)
        buffer.writeUInt16LE(25000)
        buffer.writeUInt16LE(512)
      })
    })

    it('should read 65535', () => {
      shouldRead(65535, buffer => {
        buffer.writeUInt8(0xfd)
        buffer.writeUInt16LE(65535)
        buffer.writeUInt16LE(512)
      })
    })
  })

  describe('5 bytes', () => {
    it('should read 65536', () => {
      shouldRead(65536, buffer => {
        buffer.writeUInt8(0xfe)
        buffer.writeUInt32LE(65536)
        buffer.writeUInt32LE(512)
      })
    })

    it('should read 123456789', () => {
      shouldRead(123456789, buffer => {
        buffer.writeUInt8(0xfe)
        buffer.writeUInt32LE(123456789)
        buffer.writeUInt32LE(512)
      })
    })

    it('should read 4294967295', () => {
      shouldRead(4294967295, buffer => {
        buffer.writeUInt8(0xfe)
        buffer.writeUInt32LE(4294967295)
        buffer.writeUInt32LE(512)
      })
    })
  })

  describe('9 bytes', () => {
    it('should read 4294967296', () => {
      shouldRead(4294967296, buffer => {
        buffer.writeUInt8(0xff)
        buffer.writeUInt32LE(4294967296 >>> 0)
        buffer.writeUInt32LE((4294967296 / 0x100000000) | 0)
        buffer.writeUInt32LE(999999)
      })
    })

    it('should read 5234560000000000', () => {
      shouldRead(5234560000000000, buffer => {
        buffer.writeUInt8(0xff)
        buffer.writeUInt32LE(5234560000000000 >>> 0)
        buffer.writeUInt32LE((5234560000000000 / 0x100000000) | 0)
        buffer.writeUInt32LE(999999)
      })
    })

    it('should read 9007199254740991', () => {
      shouldRead(9007199254740991, buffer => {
        buffer.writeUInt8(0xff)
        buffer.writeUInt32LE(9007199254740991 >>> 0)
        buffer.writeUInt32LE((9007199254740991 / 0x100000000) | 0)
        buffer.writeUInt32LE(999999)
      })
    })
  })
})

describe('byteLength', () => {
  it('should be 1', () => {
    expect(byteLength(0)).toStrictEqual(1)
    expect(byteLength(1)).toStrictEqual(1)
    expect(byteLength(128)).toStrictEqual(1)
    expect(byteLength(252)).toStrictEqual(1)
    expect(byteLength(0xfc)).toStrictEqual(1)
  })

  it('should be 3', () => {
    expect(byteLength(253)).toStrictEqual(3)
    expect(byteLength(1000)).toStrictEqual(3)
    expect(byteLength(10000)).toStrictEqual(3)
    expect(byteLength(65535)).toStrictEqual(3)
    expect(byteLength(0xffff)).toStrictEqual(3)
  })

  it('should be 5', () => {
    expect(byteLength(65536)).toStrictEqual(5)
    expect(byteLength(100000)).toStrictEqual(5)
    expect(byteLength(1200000)).toStrictEqual(5)
    expect(byteLength(12300000)).toStrictEqual(5)
    expect(byteLength(123400000)).toStrictEqual(5)
    expect(byteLength(1234500000)).toStrictEqual(5)
    expect(byteLength(4294967295)).toStrictEqual(5)
    expect(byteLength(0xffffffff)).toStrictEqual(5)
  })

  it('should be 9', () => {
    expect(byteLength(4294967296)).toStrictEqual(9)
    expect(byteLength(10000000000)).toStrictEqual(9)
    expect(byteLength(120000000000)).toStrictEqual(9)
    expect(byteLength(1230000000000)).toStrictEqual(9)
    expect(byteLength(12340000000000)).toStrictEqual(9)
    expect(byteLength(123450000000000)).toStrictEqual(9)
    expect(byteLength(1234560000000000)).toStrictEqual(9)
    expect(byteLength(5234560000000000)).toStrictEqual(9)
    expect(byteLength(9007199254740991)).toStrictEqual(9)
    expect(byteLength(0x1fffffffffffff)).toStrictEqual(9)
    expect(byteLength(Number.MAX_SAFE_INTEGER)).toStrictEqual(9)
  })

  it('should throw range error if out of Number.MAX_SAFE_INTEGER', () => {
    expect(() => {
      return byteLength(Number.MAX_SAFE_INTEGER + 1)
    }).toThrow('out of Number.MAX_SAFE_INTEGER range')
  })
})
