import { SmartBuffer } from 'smart-buffer'
import { OP_CODES, OP_PUSHDATA } from '../../src'

describe('[]', () => {
  const hex = '00'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes.length).toStrictEqual(0)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_0]', () => {
  const hex = '0100'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_0')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_0], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_1NEGATE]', () => {
  const hex = '014f'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_1NEGATE')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_1NEGATE], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_RESERVED]', () => {
  const hex = '0150'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_RESERVED')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_RESERVED], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_1]', () => {
  const hex = '0151'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_1')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_1], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_2]', () => {
  const hex = '0152'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_2')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_2], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_3]', () => {
  const hex = '0153'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_3')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_3], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_4]', () => {
  const hex = '0154'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_4')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_4], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_5]', () => {
  const hex = '0155'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_5')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_5], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_6]', () => {
  const hex = '0156'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_6')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_6], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_7]', () => {
  const hex = '0157'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_7')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_7], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_8]', () => {
  const hex = '0158'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_8')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_8], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_9]', () => {
  const hex = '0159'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_9')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_9], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_10]', () => {
  const hex = '015a'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_10')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_10], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_11]', () => {
  const hex = '015b'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_11')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_11], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_12]', () => {
  const hex = '015c'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_12')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_12], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_13]', () => {
  const hex = '015d'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_13')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_13], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_14]', () => {
  const hex = '015e'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_14')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_14], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_15]', () => {
  const hex = '015f'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_15')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_15], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_16]', () => {
  const hex = '0160'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_16')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_16], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_NOP]', () => {
  const hex = '0161'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_NOP')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_NOP], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_VER]', () => {
  const hex = '0162'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_VER')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_VER], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_IF]', () => {
  const hex = '0163'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_IF')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_IF], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_NOTIF]', () => {
  const hex = '0164'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_NOTIF')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_NOTIF], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_VERIF]', () => {
  const hex = '0165'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_VERIF')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_VERIF], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_VERNOTIF]', () => {
  const hex = '0166'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_VERNOTIF')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_VERNOTIF], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_ELSE]', () => {
  const hex = '0167'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_ELSE')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_ELSE], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_ENDIF]', () => {
  const hex = '0168'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_ENDIF')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_ENDIF], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_VERIFY]', () => {
  const hex = '0169'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_VERIFY')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_VERIFY], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_RETURN]', () => {
  const hex = '016a'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_RETURN')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_RETURN], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_TOALTSTACK]', () => {
  const hex = '016b'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_TOALTSTACK')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_TOALTSTACK], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_FROMALTSTACK]', () => {
  const hex = '016c'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_FROMALTSTACK')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_FROMALTSTACK], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_2DROP]', () => {
  const hex = '016d'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_2DROP')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_2DROP], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_2DUP]', () => {
  const hex = '016e'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_2DUP')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_2DUP], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_3DUP]', () => {
  const hex = '016f'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_3DUP')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_3DUP], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_2OVER]', () => {
  const hex = '0170'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_2OVER')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_2OVER], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_2ROT]', () => {
  const hex = '0171'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_2ROT')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_2ROT], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_2SWAP]', () => {
  const hex = '0172'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_2SWAP')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_2SWAP], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_IFDUP]', () => {
  const hex = '0173'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_IFDUP')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_IFDUP], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_DEPTH]', () => {
  const hex = '0174'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_DEPTH')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_DEPTH], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_DROP]', () => {
  const hex = '0175'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_DROP')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_DROP], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_DUP]', () => {
  const hex = '0176'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_DUP')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_DUP], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_NIP]', () => {
  const hex = '0177'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_NIP')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_NIP], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_OVER]', () => {
  const hex = '0178'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_OVER')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_OVER], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_PICK]', () => {
  const hex = '0179'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_PICK')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_PICK], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_ROLL]', () => {
  const hex = '017a'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_ROLL')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_ROLL], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_ROT]', () => {
  const hex = '017b'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_ROT')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_ROT], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_SWAP]', () => {
  const hex = '017c'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_SWAP')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_SWAP], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_TUCK]', () => {
  const hex = '017d'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_TUCK')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_TUCK], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_CAT]', () => {
  const hex = '017e'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_CAT')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_CAT], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_SUBSTR]', () => {
  const hex = '017f'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_SUBSTR')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_SUBSTR], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_LEFT]', () => {
  const hex = '0180'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_LEFT')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_LEFT], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_RIGHT]', () => {
  const hex = '0181'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_RIGHT')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_RIGHT], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_SIZE]', () => {
  const hex = '0182'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_SIZE')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_SIZE], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_INVERT]', () => {
  const hex = '0183'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_INVERT')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_INVERT], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_AND]', () => {
  const hex = '0184'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_AND')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_AND], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_OR]', () => {
  const hex = '0185'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_OR')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_OR], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_XOR]', () => {
  const hex = '0186'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_XOR')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_XOR], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_EQUAL]', () => {
  const hex = '0187'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_EQUAL')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_EQUAL], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_EQUALVERIFY]', () => {
  const hex = '0188'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_EQUALVERIFY')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_EQUALVERIFY], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_RESERVED1]', () => {
  const hex = '0189'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_RESERVED1')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_RESERVED1], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_RESERVED2]', () => {
  const hex = '018a'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_RESERVED2')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_RESERVED2], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_1ADD]', () => {
  const hex = '018b'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_1ADD')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_1ADD], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_1SUB]', () => {
  const hex = '018c'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_1SUB')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_1SUB], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_2MUL]', () => {
  const hex = '018d'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_2MUL')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_2MUL], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_2DIV]', () => {
  const hex = '018e'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_2DIV')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_2DIV], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_NEGATE]', () => {
  const hex = '018f'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_NEGATE')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_NEGATE], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_ABS]', () => {
  const hex = '0190'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_ABS')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_ABS], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_NOT]', () => {
  const hex = '0191'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_NOT')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_NOT], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_0NOTEQUAL]', () => {
  const hex = '0192'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_0NOTEQUAL')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_0NOTEQUAL], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_ADD]', () => {
  const hex = '0193'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_ADD')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_ADD], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_SUB]', () => {
  const hex = '0194'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_SUB')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_SUB], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_MUL]', () => {
  const hex = '0195'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_MUL')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_MUL], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_DIV]', () => {
  const hex = '0196'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_DIV')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_DIV], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_MOD]', () => {
  const hex = '0197'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_MOD')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_MOD], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_LSHIFT]', () => {
  const hex = '0198'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_LSHIFT')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_LSHIFT], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_RSHIFT]', () => {
  const hex = '0199'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_RSHIFT')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_RSHIFT], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_BOOLAND]', () => {
  const hex = '019a'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_BOOLAND')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_BOOLAND], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_BOOLOR]', () => {
  const hex = '019b'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_BOOLOR')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_BOOLOR], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_NUMEQUAL]', () => {
  const hex = '019c'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_NUMEQUAL')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_NUMEQUAL], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_NUMEQUALVERIFY]', () => {
  const hex = '019d'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_NUMEQUALVERIFY')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_NUMEQUALVERIFY], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_NUMNOTEQUAL]', () => {
  const hex = '019e'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_NUMNOTEQUAL')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_NUMNOTEQUAL], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_LESSTHAN]', () => {
  const hex = '019f'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_LESSTHAN')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_LESSTHAN], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_GREATERTHAN]', () => {
  const hex = '01a0'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_GREATERTHAN')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_GREATERTHAN], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_LESSTHANOREQUAL]', () => {
  const hex = '01a1'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_LESSTHANOREQUAL')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_LESSTHANOREQUAL], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_GREATERTHANOREQUAL]', () => {
  const hex = '01a2'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_GREATERTHANOREQUAL')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_GREATERTHANOREQUAL], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_MIN]', () => {
  const hex = '01a3'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_MIN')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_MIN], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_MAX]', () => {
  const hex = '01a4'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_MAX')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_MAX], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_WITHIN]', () => {
  const hex = '01a5'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_WITHIN')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_WITHIN], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_RIPEMD160]', () => {
  const hex = '01a6'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_RIPEMD160')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_RIPEMD160], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_SHA1]', () => {
  const hex = '01a7'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_SHA1')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_SHA1], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_SHA256]', () => {
  const hex = '01a8'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_SHA256')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_SHA256], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_HASH160]', () => {
  const hex = '01a9'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_HASH160')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_HASH160], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_HASH256]', () => {
  const hex = '01aa'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_HASH256')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_HASH256], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_CODESEPARATOR]', () => {
  const hex = '01ab'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_CODESEPARATOR')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_CODESEPARATOR], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_CHECKSIG]', () => {
  const hex = '01ac'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_CHECKSIG')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_CHECKSIG], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_CHECKSIGVERIFY]', () => {
  const hex = '01ad'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_CHECKSIGVERIFY')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_CHECKSIGVERIFY], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_CHECKMULTISIG]', () => {
  const hex = '01ae'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_CHECKMULTISIG')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_CHECKMULTISIG], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_CHECKMULTISIGVERIFY]', () => {
  const hex = '01af'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_CHECKMULTISIGVERIFY')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_CHECKMULTISIGVERIFY], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_NOP1]', () => {
  const hex = '01b0'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_NOP1')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_NOP1], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_CHECKLOCKTIMEVERIFY]', () => {
  const hex = '01b1'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_CHECKLOCKTIMEVERIFY')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_CHECKLOCKTIMEVERIFY], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_CHECKSEQUENCEVERIFY]', () => {
  const hex = '01b2'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_CHECKSEQUENCEVERIFY')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_CHECKSEQUENCEVERIFY], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_NOP4]', () => {
  const hex = '01b3'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_NOP4')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_NOP4], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_NOP5]', () => {
  const hex = '01b4'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_NOP5')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_NOP5], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_NOP6]', () => {
  const hex = '01b5'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_NOP6')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_NOP6], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_NOP7]', () => {
  const hex = '01b6'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_NOP7')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_NOP7], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_NOP8]', () => {
  const hex = '01b7'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_NOP8')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_NOP8], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_NOP9]', () => {
  const hex = '01b8'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_NOP9')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_NOP9], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_NOP10]', () => {
  const hex = '01b9'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_NOP10')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_NOP10], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_INVALIDOPCODE]', () => {
  const hex = '01ff'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_INVALIDOPCODE')
    expect(codes.length).toStrictEqual(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_INVALIDOPCODE], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_RETURN, OP_0]', () => {
  const hex = '026a00'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_RETURN')
    expect(codes[1].type).toStrictEqual('OP_0')
    expect(codes.length).toStrictEqual(2)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([OP_CODES.OP_RETURN, OP_CODES.OP_0], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_RETURN, OP_PUSHDATA, OP_0]', () => {
  const hex = '176a14d35d458fd3495704238a3ff033bea9e95989072c00'
  const pushData = 'd35d458fd3495704238a3ff033bea9e95989072c'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].type).toStrictEqual('OP_RETURN')
    expect((codes[1] as OP_PUSHDATA).hex).toStrictEqual(pushData)
    expect(codes[2].type).toStrictEqual('OP_0')
    expect(codes.length).toStrictEqual(3)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([
      OP_CODES.OP_RETURN,
      new OP_PUSHDATA(Buffer.from(pushData, 'hex'), 'little'),
      OP_CODES.OP_0
    ], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('[OP_PUSHDATA, OP_0]', () => {
  const hex = '100e5704238a3ff033bea9e95989072c00'
  const pushData = '5704238a3ff033bea9e95989072c'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect((codes[0] as OP_PUSHDATA).hex).toStrictEqual(pushData)
    expect(codes[1].type).toStrictEqual('OP_0')
    expect(codes.length).toStrictEqual(2)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([
      new OP_PUSHDATA(Buffer.from(pushData, 'hex'), 'little'),
      OP_CODES.OP_0
    ], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('P2PKH: [OP_DUP, OP_HASH160, OP_PUSHDATA<RIPEMD160(SHA256(pubkey))>, OP_EQUALVERIFY, OP_CHECKSIG]', () => {
  const hex = '1976a9143bde42dbee7e4dbe6a21b2d50ce2f0167faa815988ac'
  const pushData = '3bde42dbee7e4dbe6a21b2d50ce2f0167faa8159'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes.length).toStrictEqual(5)
    expect(codes[0].type).toStrictEqual('OP_DUP')
    expect(codes[1].type).toStrictEqual('OP_HASH160')
    expect((codes[2] as OP_PUSHDATA).hex).toStrictEqual(pushData)
    expect(codes[3].type).toStrictEqual('OP_EQUALVERIFY')
    expect(codes[4].type).toStrictEqual('OP_CHECKSIG')
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([
      OP_CODES.OP_DUP,
      OP_CODES.OP_HASH160,
      new OP_PUSHDATA(Buffer.from(pushData, 'hex'), 'little'),
      OP_CODES.OP_EQUALVERIFY,
      OP_CODES.OP_CHECKSIG
    ], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('P2SH: [OP_HASH160, OP_PUSHDATA<RIPEMD160(SHA256(script))>, OP_EQUAL]', () => {
  const hex = '17a914e9c3dd0c07aac76179ebc76a6c78d4d67c6c160a87'
  const pushData = 'e9c3dd0c07aac76179ebc76a6c78d4d67c6c160a'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes.length).toStrictEqual(3)
    expect(codes[0].type).toStrictEqual('OP_HASH160')
    expect((codes[1] as OP_PUSHDATA).hex).toStrictEqual(pushData)
    expect(codes[2].type).toStrictEqual('OP_EQUAL')
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([
      OP_CODES.OP_HASH160,
      new OP_PUSHDATA(Buffer.from(pushData, 'hex'), 'little'),
      OP_CODES.OP_EQUAL
    ], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('P2WPKH: [OP_0, OP_PUSHDATA<RIPEMD160(SHA256(pubkey))>]', () => {
  const hex = '1600140e7c0ab18b305bc987a266dc06de26fcfab4b56a'
  const pushData = '0e7c0ab18b305bc987a266dc06de26fcfab4b56a'

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes.length).toStrictEqual(2)
    expect(codes[0].type).toStrictEqual('OP_0')
    expect((codes[1] as OP_PUSHDATA).hex).toStrictEqual(pushData)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([
      OP_CODES.OP_0,
      new OP_PUSHDATA(Buffer.from(pushData, 'hex'), 'little')
    ], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})

describe('P2WSH: [OP_0, OP_PUSHDATA<SHA256(script)>]', () => {
  const hex = '2200209e1be07558ea5cc8e02ed1d80c0911048afad949affa36d5c3951e3159dbea19'
  const pushData = '9e1be07558ea5cc8e02ed1d80c0911048afad949affa36d5c3951e3159dbea19' // 32 bytes

  it('should map fromBuffer', () => {
    const codes = OP_CODES.fromBuffer(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes.length).toStrictEqual(2)
    expect(codes[0].type).toStrictEqual('OP_0')
    expect((codes[1] as OP_PUSHDATA).hex.length).toStrictEqual(64)
    expect((codes[1] as OP_PUSHDATA).hex).toStrictEqual(pushData)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    OP_CODES.toBuffer([
      OP_CODES.OP_0,
      new OP_PUSHDATA(Buffer.from(pushData, 'hex'), 'little')
    ], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toStrictEqual(hex)
  })
})
