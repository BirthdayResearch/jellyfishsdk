import { SmartBuffer } from 'smart-buffer'
import script, { OP_CODES, OP_PUSHDATA } from '../../src/script'

describe('[]', () => {
  const hex = '00'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes.length).toBe(0)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_0]', () => {
  const hex = '0100'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toBe('OP_0')
    expect(codes.length).toBe(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([OP_CODES.OP_0], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_1NEGATE]', () => {
  const hex = '014f'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toBe('OP_1NEGATE')
    expect(codes.length).toBe(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([OP_CODES.OP_1NEGATE], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_1]', () => {
  const hex = '0151'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toBe('OP_1')
    expect(codes.length).toBe(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([OP_CODES.OP_1], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_2]', () => {
  const hex = '0152'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toBe('OP_2')
    expect(codes.length).toBe(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([OP_CODES.OP_2], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_3]', () => {
  const hex = '0153'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toBe('OP_3')
    expect(codes.length).toBe(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([OP_CODES.OP_3], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_4]', () => {
  const hex = '0154'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toBe('OP_4')
    expect(codes.length).toBe(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([OP_CODES.OP_4], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_5]', () => {
  const hex = '0155'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toBe('OP_5')
    expect(codes.length).toBe(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([OP_CODES.OP_5], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_6]', () => {
  const hex = '0156'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toBe('OP_6')
    expect(codes.length).toBe(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([OP_CODES.OP_6], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_7]', () => {
  const hex = '0157'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toBe('OP_7')
    expect(codes.length).toBe(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([OP_CODES.OP_7], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_8]', () => {
  const hex = '0158'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toBe('OP_8')
    expect(codes.length).toBe(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([OP_CODES.OP_8], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_9]', () => {
  const hex = '0159'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toBe('OP_9')
    expect(codes.length).toBe(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([OP_CODES.OP_9], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_10]', () => {
  const hex = '015a'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toBe('OP_10')
    expect(codes.length).toBe(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([OP_CODES.OP_10], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_11]', () => {
  const hex = '015b'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toBe('OP_11')
    expect(codes.length).toBe(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([OP_CODES.OP_11], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_12]', () => {
  const hex = '015c'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toBe('OP_12')
    expect(codes.length).toBe(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([OP_CODES.OP_12], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_13]', () => {
  const hex = '015d'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toBe('OP_13')
    expect(codes.length).toBe(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([OP_CODES.OP_13], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_14]', () => {
  const hex = '015e'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toBe('OP_14')
    expect(codes.length).toBe(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([OP_CODES.OP_14], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_15]', () => {
  const hex = '015f'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toBe('OP_15')
    expect(codes.length).toBe(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([OP_CODES.OP_15], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_16]', () => {
  const hex = '0160'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toBe('OP_16')
    expect(codes.length).toBe(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([OP_CODES.OP_16], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_RETURN]', () => {
  const hex = '016a'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toBe('OP_RETURN')
    expect(codes.length).toBe(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([OP_CODES.OP_RETURN], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_RIPEMD160]', () => {
  const hex = '01a6'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toBe('OP_RIPEMD160')
    expect(codes.length).toBe(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([OP_CODES.OP_RIPEMD160], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_RETURN, OP_0]', () => {
  const hex = '026a00'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toBe('OP_RETURN')
    expect(codes[1].type).toBe('OP_0')
    expect(codes.length).toBe(2)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([OP_CODES.OP_RETURN, OP_CODES.OP_0], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_RETURN, OP_PUSHDATA, OP_0]', () => {
  const hex = '176a14d35d458fd3495704238a3ff033bea9e95989072c00'
  const pushData = 'd35d458fd3495704238a3ff033bea9e95989072c'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toBe('OP_RETURN')
    expect((codes[1] as OP_PUSHDATA).hex).toBe(pushData)
    expect(codes[2].type).toBe('OP_0')
    expect(codes.length).toBe(3)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([
      OP_CODES.OP_RETURN,
      new OP_PUSHDATA(Buffer.from(pushData, 'hex'), 'little'),
      OP_CODES.OP_0
    ], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_PUSHDATA, OP_0]', () => {
  const hex = '100e5704238a3ff033bea9e95989072c00'
  const pushData = '5704238a3ff033bea9e95989072c'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect((codes[0] as OP_PUSHDATA).hex).toBe(pushData)
    expect(codes[1].type).toBe('OP_0')
    expect(codes.length).toBe(2)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([
      new OP_PUSHDATA(Buffer.from(pushData, 'hex'), 'little'),
      OP_CODES.OP_0
    ], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('P2PKH: [OP_DUP, OP_HASH160, OP_PUSHDATA<RIPEMD160(SHA256(pubkey))>, OP_EQUALVERIFY, OP_CHECKSIG]', () => {
  const hex = '1976a9143bde42dbee7e4dbe6a21b2d50ce2f0167faa815988ac'
  const pushData = '3bde42dbee7e4dbe6a21b2d50ce2f0167faa8159'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes.length).toBe(5)
    expect(codes[0].type).toBe('OP_DUP')
    expect(codes[1].type).toBe('OP_HASH160')
    expect((codes[2] as OP_PUSHDATA).hex).toBe(pushData)
    expect(codes[3].type).toBe('OP_EQUALVERIFY')
    expect(codes[4].type).toBe('OP_CHECKSIG')
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([
      OP_CODES.OP_DUP,
      OP_CODES.OP_HASH160,
      new OP_PUSHDATA(Buffer.from(pushData, 'hex'), 'little'),
      OP_CODES.OP_EQUALVERIFY,
      OP_CODES.OP_CHECKSIG
    ], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('P2SH: [OP_HASH160, OP_PUSHDATA<RIPEMD160(SHA256(script))>, OP_EQUAL]', () => {
  const hex = '17a914e9c3dd0c07aac76179ebc76a6c78d4d67c6c160a87'
  const pushData = 'e9c3dd0c07aac76179ebc76a6c78d4d67c6c160a'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes.length).toBe(3)
    expect(codes[0].type).toBe('OP_HASH160')
    expect((codes[1] as OP_PUSHDATA).hex).toBe(pushData)
    expect(codes[2].type).toBe('OP_EQUAL')
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([
      OP_CODES.OP_HASH160,
      new OP_PUSHDATA(Buffer.from(pushData, 'hex'), 'little'),
      OP_CODES.OP_EQUAL
    ], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('P2WPKH: [OP_0, OP_PUSHDATA<RIPEMD160(SHA256(pubkey))>]', () => {
  const hex = '1600140e7c0ab18b305bc987a266dc06de26fcfab4b56a'
  const pushData = '0e7c0ab18b305bc987a266dc06de26fcfab4b56a'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes.length).toBe(2)
    expect(codes[0].type).toBe('OP_0')
    expect((codes[1] as OP_PUSHDATA).hex).toBe(pushData)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([
      OP_CODES.OP_0,
      new OP_PUSHDATA(Buffer.from(pushData, 'hex'), 'little')
    ], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('P2WSH: [OP_0, OP_PUSHDATA<SHA256(script)>]', () => {
  const hex = '2200209e1be07558ea5cc8e02ed1d80c0911048afad949affa36d5c3951e3159dbea19'
  const pushData = '9e1be07558ea5cc8e02ed1d80c0911048afad949affa36d5c3951e3159dbea19' // 32 bytes

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes.length).toBe(2)
    expect(codes[0].type).toBe('OP_0')
    expect((codes[1] as OP_PUSHDATA).hex.length).toBe(64)
    expect((codes[1] as OP_PUSHDATA).hex).toBe(pushData)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([
      OP_CODES.OP_0,
      new OP_PUSHDATA(Buffer.from(pushData, 'hex'), 'little')
    ], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})
