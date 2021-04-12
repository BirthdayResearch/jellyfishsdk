import { SmartBuffer } from 'smart-buffer'
import { BufferComposer, ComposableBuffer } from '../../src/buffer/buffer_composer'
import { readVarUInt, writeVarUInt } from '../../src/buffer/buffer_varuint'

function hexAsBufferLE (hex: string | string[]): SmartBuffer {
  if (typeof hex === 'string') {
    const buffer = Buffer.from(hex, 'hex').reverse()
    return SmartBuffer.fromBuffer(buffer)
  }

  const buffer = new SmartBuffer()
  for (const hex1 of hex) {
    buffer.writeBuffer(Buffer.from(hex1, 'hex').reverse())
  }
  return buffer
}

/* eslint-disable no-return-assign */

it('should format (4 bytes, 32 bytes, 8 bytes) hex with hexAsBufferLE', () => {
  // assert hexAsBufferLE conditions is as expected.

  const buffer = hexAsBufferLE([
    '00080008',
    'fff7f7881a8099afa6940d42d1e7f6362bec38171ea3edf433541db4e4ad969f',
    '01aa535d3d0c0000'
  ])
  expect(buffer.toString('hex'))
    .toBe('080008009f96ade4b41d5433f4eda31e1738ec2b36f6e7d1420d94a6af99801a88f7f7ff00000c3d5d53aa01')
})

function shouldFromBuffer<T> (composer: BufferComposer, hex: string | string[], val: T, getter: () => T): void {
  composer.fromBuffer(hexAsBufferLE(hex))
  expect(getter()).toEqual(val)
}

function shouldToBuffer<T> (composer: BufferComposer, hex: string | string[], val: T, setter: (v: T) => void): void {
  setter(val)
  const buffer: SmartBuffer = new SmartBuffer()
  composer.toBuffer(buffer)
  const expected: SmartBuffer = hexAsBufferLE(hex)
  expect(buffer.toString('hex')).toBe(expected.toString('hex'))
}

describe('ComposableBuffer deep implementation', () => {
  interface Root {
    ver: number // 1 byte
    items: Item[] // c = VarUInt{1-9 bytes}, + c x Item
    text: string // n = VarUInt{1-9 bytes}, + n bytes
  }

  interface Item {
    ver: number // 2 bytes
    val: number // 4 bytes
    hex: string // 8 bytes
  }

  class CRoot extends ComposableBuffer<Root> implements Root {
    composers (root: Root): BufferComposer[] {
      return [
        ComposableBuffer.uInt8(() => root.ver, v => root.ver = v),
        ComposableBuffer.varUIntArray(() => root.items, v => root.items = v, item => {
          return new CItem(item)
        }),
        {
          fromBuffer (buffer: SmartBuffer) {
            const length = readVarUInt(buffer)
            const buff = Buffer.from(buffer.readBuffer(length))
            root.text = buff.reverse().toString('utf-8')
          },
          toBuffer (buffer: SmartBuffer) {
            const text = root.text
            const buff = Buffer.from(text, 'utf-8').reverse()
            writeVarUInt(buff.length, buffer)
            buffer.writeBuffer(buff)
          }
        }
      ]
    }

    get ver (): number {
      return this.data.ver
    }

    get items (): Item[] {
      return this.data.items
    }

    get text (): string {
      return this.data.text
    }
  }

  class CItem extends ComposableBuffer<Item> implements Item {
    composers (data: Item): BufferComposer[] {
      return [
        ComposableBuffer.uInt16(() => data.ver, v => data.ver = v),
        ComposableBuffer.uInt32(() => data.val, v => data.val = v),
        ComposableBuffer.hex(8, () => data.hex, v => data.hex = v)
      ]
    }

    get ver (): number {
      return this.data.ver
    }

    get val (): number {
      return this.data.val
    }

    get hex (): string {
      return this.data.hex
    }
  }

  const data: Root = {
    ver: 0x01,
    items: [
      {
        ver: 0x0001,
        val: 0x00004000,
        hex: 'ef51e1b804cc89d1'
      }, {
        ver: 0x0001,
        val: 0x00008000,
        hex: 'df5a4bdc045c1dd1'
      }
    ],
    text: 'hello world'
  }

  const hex = '0102010000400000d189cc04b8e151ef010000800000d11d5c04dc4b5adf0b646c726f77206f6c6c6568'

  it('CRoot to buffer', () => {
    const root = new CRoot(data)
    const buffer = new SmartBuffer()
    root.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toBe(hex)
  })

  it('CRoot to JSON deeply compare', () => {
    const root = new CRoot(data)
    expect(JSON.stringify(root.toObject())).toBe(JSON.stringify(data))
  })

  it('buffer to CRoot', () => {
    const buffer = SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    const root = new CRoot(buffer)

    expect(JSON.stringify(root.data)).toBe(JSON.stringify(data))
  })
})

describe('ComposableBuffer.varUIntArray', () => {
  interface VarItem {
    val: number // 2 bytes
    hex: string // 12 bytes
  }

  let items: VarItem[] = []

  class CVarItem extends ComposableBuffer<VarItem> {
    composers (data: VarItem): BufferComposer[] {
      return [
        ComposableBuffer.uInt16(() => data.val, v => data.val = v),
        ComposableBuffer.hex(12, () => data.hex, v => data.hex = v)
      ]
    }
  }

  const composer = ComposableBuffer.varUIntArray(() => items, (v) => items = v, (v) => {
    return new CVarItem(v)
  })

  describe('[1 byte, (2 bytes, 12 bytes), (2 bytes, 12 bytes)]', () => {
    const hex = [
      '02',
      'a000',
      'fff7f7881a8099afa6940d42',
      '0080',
      'ef51e1b804cc89d182d27965'
    ]

    const val = [
      {
        val: 0xa000,
        hex: 'fff7f7881a8099afa6940d42'
      },
      {
        val: 0x0080,
        hex: 'ef51e1b804cc89d182d27965'
      }
    ]

    it('should fromBuffer', () => {
      items = val
      shouldFromBuffer(composer, hex, val, () => items)
    })

    it('should toBuffer', () => {
      shouldToBuffer(composer, hex, val, v => items = v)
    })
  })

  describe('validate', () => {
    it('should fail toBuffer deeply due to hex invalid length', () => {
      items = [
        {
          val: 0xa000,
          hex: 'fff7f7881a8099afa6940d421'
        }
      ]

      expect(() => {
        composer.toBuffer(new SmartBuffer())
      }).toThrow('ComposableBuffer.hex.toBuffer invalid as length != getter().length')
    })

    it('should fail toBuffer deeply due to value out of range', () => {
      items = [
        {
          val: 0xFFFFF000,
          hex: 'fff7f7881a8099afa6940d42'
        }
      ]

      expect(() => {
        composer.toBuffer(new SmartBuffer())
      }).toThrow('It must be >= 0 and <= 65535. Received 4294963200')
    })
  })
})

describe('ComposableBuffer.array', () => {
  interface Item {
    value: BigInt // 8 bytes
    txid: string // 32 bytes
  }

  let items: Item[] = []

  class CItem extends ComposableBuffer<Item> {
    composers (data: Item): BufferComposer[] {
      return [
        ComposableBuffer.bigUInt64(() => data.value, v => data.value = v),
        ComposableBuffer.hex(32, () => data.txid, v => data.txid = v)
      ]
    }
  }

  const composer = ComposableBuffer.array(() => items, (v) => items = v, (v) => {
    return new CItem(v)
  }, () => items.length)

  describe('[(8 bytes, 32 bytes),(8 bytes, 32 bytes)]', () => {
    const hex = [
      '0008000800080008',
      'fff7f7881a8099afa6940d42d1e7f6362bec38171ea3edf433541db4e4ad969f',
      '01aa535d3d0c0000',
      'ef51e1b804cc89d182d279655c3aa89e815b1b309fe287d9b2b55d57b90ec68a'
    ]

    const val = [
      {
        value: BigInt('0x0008000800080008'),
        txid: 'fff7f7881a8099afa6940d42d1e7f6362bec38171ea3edf433541db4e4ad969f'
      },
      {
        value: BigInt('0x01aa535d3d0c0000'),
        txid: 'ef51e1b804cc89d182d279655c3aa89e815b1b309fe287d9b2b55d57b90ec68a'
      }
    ]

    it('should fromBuffer', () => {
      items = val
      shouldFromBuffer(composer, hex, val, () => items)
    })

    it('should toBuffer', () => {
      shouldToBuffer(composer, hex, val, v => items = v)
    })
  })

  describe('validate', () => {
    it('should fail toBuffer deeply due to hex invalid length', () => {
      items = [
        {
          value: BigInt('0x0008000800080008'),
          txid: 'fff7f7881a8099afa6940d42d1e7f636'
        }
      ]

      expect(() => {
        composer.toBuffer(new SmartBuffer())
      }).toThrow('ComposableBuffer.hex.toBuffer invalid as length != getter().length')
    })

    it('should fail toBuffer deeply due to value out of range', () => {
      items = [
        {
          value: BigInt('0x100008000800080008'),
          txid: 'fff7f7881a8099afa6940d42d1e7f6362bec38171ea3edf433541db4e4ad969f'
        }
      ]

      expect(() => {
        composer.toBuffer(new SmartBuffer())
      }).toThrow('It must be >= 0n and < 2n ** 64n. Received 295_150_157_013_526_773_768n')
    })
  })
})

describe('ComposableBuffer.single', () => {
  interface Single {
    id: string // 16 bytes
    value: number // 2 bytes
  }

  let object: Single = {
    id: 'ef51e1b804cc89d182d279655c3aa89e',
    value: 0
  }

  class CSingle extends ComposableBuffer<Single> {
    composers (data: Single): BufferComposer[] {
      return [
        ComposableBuffer.hex(16, () => data.id, v => data.id = v),
        ComposableBuffer.uInt16(() => data.value, v => data.value = v)
      ]
    }
  }

  const composer = ComposableBuffer.single(() => object, (v) => object = v, (v) => {
    return new CSingle(v)
  })

  describe('16 bytes + 2 bytes', () => {
    it('should fromBuffer', () => {
      shouldFromBuffer(composer, [
        'ef51e1b804cc89d182d2796a5c3af89e',
        '0008'
      ], {
        id: 'ef51e1b804cc89d182d2796a5c3af89e',
        value: 0x0008
      }, () => object)
    })

    it('should toBuffer', () => {
      shouldToBuffer(composer, [
        'ef51e1b804cc89d182d2796a5c3af89e',
        '0001'
      ], {
        id: 'ef51e1b804cc89d182d2796a5c3af89e',
        value: 0x0001
      }, v => object = v)
    })
  })

  describe('validate', () => {
    it('should fail toBuffer deeply due to hex invalid length', () => {
      object = {
        id: '',
        value: 0x0000
      }

      expect(() => {
        composer.toBuffer(new SmartBuffer())
      }).toThrow('ComposableBuffer.hex.toBuffer invalid as length != getter().length')
    })

    it('should fail toBuffer deeply due to value out of range', () => {
      object = {
        id: 'ef51e1b804cc89d182d279655c3aa89e',
        value: 0xFFFF0000
      }

      expect(() => {
        composer.toBuffer(new SmartBuffer())
      }).toThrow('It must be >= 0 and <= 65535. Received 4294901760')
    })
  })
})

describe('ComposableBuffer.hex', () => {
  const composer = ComposableBuffer.hex(16, () => value, (v: string) => value = v)
  const expectedBuffer = Buffer.from('ef51e1b804cc89d182d279655c3aa89e', 'hex').reverse()
  let value = ''

  it('should fromBuffer', () => {
    composer.fromBuffer(SmartBuffer.fromBuffer(expectedBuffer))

    expect(value).toBe('ef51e1b804cc89d182d279655c3aa89e')
  })

  it('should toBuffer', () => {
    value = 'ef51e1b804cc89d182d279655c3aa89e'

    const buffer = new SmartBuffer()
    composer.toBuffer(buffer)

    expect(buffer.toBuffer().toString('hex')).toBe(expectedBuffer.toString('hex'))
  })

  it('should not have side effect when reading and writing', () => {
    const from = SmartBuffer.fromBuffer(expectedBuffer)
    composer.fromBuffer(from)
    const to = new SmartBuffer()
    composer.toBuffer(to)

    expect(from.toString()).toBe(to.toString())
  })

  it('should fail toBuffer validate', () => {
    value = 'ef'

    expect(() => {
      composer.toBuffer(new SmartBuffer())
    }).toThrow('ComposableBuffer.hex.toBuffer invalid as length != getter().length')
  })
})

describe('ComposableBuffer.uInt8', () => {
  let value = 0x00
  const composer = ComposableBuffer.uInt8(() => value, (v: number) => value = v)

  describe('0x01', () => {
    it('should fromBuffer', () => {
      shouldFromBuffer(composer, '01', 0x01, () => value)
    })

    it('should toBuffer', () => {
      shouldToBuffer(composer, '01', 0x01, v => value = v)
    })
  })

  describe('0xb1', () => {
    it('should fromBuffer', () => {
      shouldFromBuffer(composer, 'b1', 0xb1, () => value)
    })

    it('should toBuffer', () => {
      shouldToBuffer(composer, 'b1', 0xb1, v => value = v)
    })
  })

  it('should fail toBuffer validate', () => {
    value = 0xfff

    expect(() => {
      composer.toBuffer(new SmartBuffer())
    }).toThrow('It must be >= 0 and <= 255. Received 4095')
  })
})

describe('ComposableBuffer.uInt16', () => {
  let value = 0x0000
  const composer = ComposableBuffer.uInt16(() => value, (v: number) => value = v)

  describe('0x0081', () => {
    it('should fromBuffer', () => {
      shouldFromBuffer(composer, '0081', 0x0081, () => value)
    })

    it('should toBuffer', () => {
      shouldToBuffer(composer, '0081', 0x0081, v => value = v)
    })
  })

  describe('0x0801', () => {
    it('should fromBuffer', () => {
      shouldFromBuffer(composer, '0801', 0x0801, () => value)
    })

    it('should toBuffer', () => {
      shouldToBuffer(composer, '0801', 0x0801, v => value = v)
    })
  })

  it('should fail toBuffer validate', () => {
    value = 0x01ffff

    expect(() => {
      composer.toBuffer(new SmartBuffer())
    }).toThrow('It must be >= 0 and <= 65535. Received 131071')
  })
})

describe('ComposableBuffer.int32', () => {
  let value = 0x00000000
  const composer = ComposableBuffer.int32(() => value, (v: number) => value = v)

  describe('0x00000002', () => {
    it('should fromBuffer', () => {
      shouldFromBuffer(composer, '00000002', 0x00000002, () => value)
    })

    it('should toBuffer', () => {
      shouldToBuffer(composer, '00000002', 0x00000002, v => value = v)
    })
  })

  describe('0x00aa0002', () => {
    it('should fromBuffer', () => {
      shouldFromBuffer(composer, '00aa0002', 0x00aa0002, () => value)
    })

    it('should toBuffer', () => {
      shouldToBuffer(composer, '00aa0002', 0x00aa0002, v => value = v)
    })
  })

  describe('2147483647', () => {
    it('should fromBuffer', () => {
      shouldFromBuffer(composer, '7FFFFFFF', 2147483647, () => value)
    })

    it('should toBuffer', () => {
      shouldToBuffer(composer, '7FFFFFFF', 2147483647, v => value = v)
    })
  })

  describe('-1660944385', () => {
    it('should fromBuffer', () => {
      shouldFromBuffer(composer, '9CFFFFFF', -1660944385, () => value)
    })

    it('should toBuffer', () => {
      shouldToBuffer(composer, '9CFFFFFF', -1660944385, v => value = v)
    })
  })

  it('should fail toBuffer validate', () => {
    value = 0x100000000

    expect(() => {
      composer.toBuffer(new SmartBuffer())
    }).toThrow('It must be >= -2147483648 and <= 2147483647. Received 4294967296')
  })
})

describe('ComposableBuffer.uInt32', () => {
  let value = 0x00000000
  const composer = ComposableBuffer.uInt32(() => value, (v: number) => value = v)

  describe('0x00000001', () => {
    it('should fromBuffer', () => {
      shouldFromBuffer(composer, '00000001', 0x00000001, () => value)
    })

    it('should toBuffer', () => {
      shouldToBuffer(composer, '00000001', 0x00000001, v => value = v)
    })
  })

  describe('0x0faa0002', () => {
    it('should fromBuffer', () => {
      shouldFromBuffer(composer, '0faa0002', 0x0faa0002, () => value)
    })

    it('should toBuffer', () => {
      shouldToBuffer(composer, '0faa0002', 0x0faa0002, v => value = v)
    })
  })

  describe('2147483647', () => {
    it('should fromBuffer', () => {
      shouldFromBuffer(composer, '7FFFFFFF', 2147483647, () => value)
    })

    it('should toBuffer', () => {
      shouldToBuffer(composer, '7FFFFFFF', 2147483647, v => value = v)
    })
  })

  describe('4000000000', () => {
    it('should fromBuffer', () => {
      shouldFromBuffer(composer, 'ee6b2800', 4000000000, () => value)
    })

    it('should toBuffer', () => {
      shouldToBuffer(composer, 'ee6b2800', 4000000000, v => value = v)
    })
  })

  it('should fail toBuffer validate', () => {
    value = 0x100000000

    expect(() => {
      composer.toBuffer(new SmartBuffer())
    }).toThrow('It must be >= 0 and <= 4294967295. Received 4294967296')
  })
})

describe('ComposableBuffer.bigUInt64', () => {
  let value: BigInt = BigInt('0x01')
  const composer = ComposableBuffer.bigUInt64(() => value, (v: BigInt) => value = v)

  describe('0x0000000000000001', () => {
    it('should fromBuffer', () => {
      shouldFromBuffer(composer, '0000000000000001', BigInt('0x0000000000000001'), () => value)
    })

    it('should toBuffer', () => {
      shouldToBuffer(composer, '0000000000000001', BigInt('0x0000000000000001'), v => value = v)
    })
  })

  describe('0x8000000000000001', () => {
    it('should fromBuffer', () => {
      shouldFromBuffer(composer, '8000000000000001', BigInt('0x8000000000000001'), () => value)
    })

    it('should toBuffer', () => {
      shouldToBuffer(composer, '8000000000000001', BigInt('0x8000000000000001'), v => value = v)
    })
  })

  describe('0xff00000000000001', () => {
    it('should fromBuffer', () => {
      shouldFromBuffer(composer, 'ff00000000000001', BigInt('0xff00000000000001'), () => value)
    })

    it('should toBuffer', () => {
      shouldToBuffer(composer, 'ff00000000000001', BigInt('0xff00000000000001'), v => value = v)
    })
  })

  describe('4000000000', () => {
    it('should fromBuffer', () => {
      shouldFromBuffer(composer, '00000000ee6b2800', BigInt(4000000000), () => value)
    })

    it('should toBuffer', () => {
      shouldToBuffer(composer, '00000000ee6b2800', BigInt(4000000000), v => value = v)
    })
  })

  describe('120000000000000000', () => {
    // 1200000000.00000000 MAX DFI Supply

    it('should fromBuffer', () => {
      shouldFromBuffer(composer, '01aa535d3d0c0000', BigInt('120000000000000000'), () => value)
    })

    it('should toBuffer', () => {
      shouldToBuffer(composer, '01aa535d3d0c0000', BigInt('120000000000000000'), v => value = v)
    })
  })

  it('should fail toBuffer validate', () => {
    value = BigInt('0x10000000000000001')

    expect(() => {
      composer.toBuffer(new SmartBuffer())
    }).toThrow('It must be >= 0n and < 2n ** 64n. Received 18_446_744_073_709_551_617n')
  })
})

describe('ComposableBuffer.varUInt', () => {
  let value: number = 0
  const composer = ComposableBuffer.varUInt(() => value, (v: number) => value = v)

  describe('1 byte = 0', () => {
    it('should fromBuffer', () => {
      shouldFromBuffer(composer, '00', 0x00, () => value)
    })

    it('should toBuffer', () => {
      shouldToBuffer(composer, '00', 0x00, v => value = v)
    })
  })

  describe('1 byte = 100', () => {
    it('should fromBuffer', () => {
      shouldFromBuffer(composer, '64', 100, () => value)
    })

    it('should toBuffer', () => {
      shouldToBuffer(composer, '64', 100, v => value = v)
    })
  })

  describe('3 bytes = 1000', () => {
    it('should fromBuffer', () => {
      const buffer = new SmartBuffer()
      buffer.writeUInt8(0xfd)
      buffer.writeUInt16LE(0x03e8)

      composer.fromBuffer(buffer)
      expect(value).toBe(1000)
    })

    it('should toBuffer', () => {
      value = 1000

      const buffer = new SmartBuffer()
      composer.toBuffer(buffer)

      const expected = Buffer.from('fde803', 'hex')
      expect(buffer.toString()).toBe(expected.toString())
    })
  })

  describe('5 bytes = 100000', () => {
    it('should fromBuffer', () => {
      const buffer = new SmartBuffer()
      buffer.writeUInt8(0xfe)
      buffer.writeUInt32LE(0x000186a0)

      composer.fromBuffer(buffer)
      expect(value).toBe(100000)
    })

    it('should toBuffer', () => {
      value = 100000

      const buffer = new SmartBuffer()
      composer.toBuffer(buffer)

      const expected = Buffer.from('fea0860100', 'hex')
      expect(buffer.toString()).toBe(expected.toString())
    })
  })

  describe('9 bytes = 10000000000', () => {
    it('should fromBuffer', () => {
      const buffer = new SmartBuffer()
      buffer.writeUInt8(0xff)
      buffer.writeBigInt64LE(BigInt(10000000000))

      composer.fromBuffer(buffer)
      expect(value).toBe(10000000000)
    })

    it('should toBuffer', () => {
      value = 10000000000

      const buffer = new SmartBuffer()
      composer.toBuffer(buffer)

      const expected = Buffer.from('ff00e40b5402000000', 'hex')
      expect(buffer.toString()).toBe(expected.toString())
    })
  })

  it('should fail fromBuffer out of MAX_SAFE_INTEGER', () => {
    const buffer = new SmartBuffer()
    buffer.writeUInt8(0xff)
    buffer.writeUInt32LE(0xffffffff)
    buffer.writeUInt32LE(0xffffffff)

    expect(() => {
      composer.fromBuffer(buffer)
    }).toThrow('out of Number.MAX_SAFE_INTEGER range')
  })
})
