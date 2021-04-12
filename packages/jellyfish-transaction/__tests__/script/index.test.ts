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
    expect(codes[0].asm()).toBe('OP_0')
    expect(codes.length).toBe(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([OP_CODES.OP_0], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_RETURN]', () => {
  const hex = '016a'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].asm()).toBe('OP_RETURN')
    expect(codes.length).toBe(1)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([OP_CODES.OP_RETURN], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_RETURN, OP_0]', () => {
  const hex = '026a00'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].asm()).toBe('OP_RETURN')
    expect(codes[1].asm()).toBe('OP_0')
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
  const pushData = '2c078959e9a9be33f03f8a23045749d38f455dd3'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].asm()).toBe('OP_RETURN')
    expect(codes[1].asm()).toBe(pushData)
    expect(codes[2].asm()).toBe('OP_0')
    expect(codes.length).toBe(3)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([
      OP_CODES.OP_RETURN,
      new OP_PUSHDATA(Buffer.from(pushData, 'hex'), 'big'),
      OP_CODES.OP_0
    ], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('[OP_PUSHDATA, OP_0]', () => {
  const hex = '100e5704238a3ff033bea9e95989072c00'
  const pushData = '2c078959e9a9be33f03f8a230457'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes[0].asm()).toBe(pushData)
    expect(codes[1].asm()).toBe('OP_0')
    expect(codes.length).toBe(2)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([
      new OP_PUSHDATA(Buffer.from(pushData, 'hex'), 'big'),
      OP_CODES.OP_0
    ], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('P2PKH: [OP_DUP, OP_HASH160, OP_PUSHDATA<RIPEMD160(SHA256(pubkey))>, OP_EQUALVERIFY, OP_CHECKSIG]', () => {
  const hex = '1976a9143bde42dbee7e4dbe6a21b2d50ce2f0167faa815988ac'
  const pushData = '5981aa7f16f0e20cd5b2216abe4d7eeedb42de3b'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes.length).toBe(5)
    expect(codes[0].asm()).toBe('OP_DUP')
    expect(codes[1].asm()).toBe('OP_HASH160')
    expect(codes[2].asm()).toBe(pushData)
    expect(codes[3].asm()).toBe('OP_EQUALVERIFY')
    expect(codes[4].asm()).toBe('OP_CHECKSIG')
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([
      OP_CODES.OP_DUP,
      OP_CODES.OP_HASH160,
      new OP_PUSHDATA(Buffer.from(pushData, 'hex'), 'big'),
      OP_CODES.OP_EQUALVERIFY,
      OP_CODES.OP_CHECKSIG
    ], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('P2SH: [OP_HASH160, OP_PUSHDATA<RIPEMD160(SHA256(script))>, OP_EQUAL]', () => {
  const hex = '17a914e9c3dd0c07aac76179ebc76a6c78d4d67c6c160a87'
  const pushData = '0a166c7cd6d4786c6ac7eb7961c7aa070cddc3e9'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes.length).toBe(3)
    expect(codes[0].asm()).toBe('OP_HASH160')
    expect(codes[1].asm()).toBe(pushData)
    expect(codes[2].asm()).toBe('OP_EQUAL')
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([
      OP_CODES.OP_HASH160,
      new OP_PUSHDATA(Buffer.from(pushData, 'hex'), 'big'),
      OP_CODES.OP_EQUAL
    ], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('P2WPKH: [OP_0, OP_PUSHDATA<RIPEMD160(SHA256(pubkey))>]', () => {
  const hex = '1600140e7c0ab18b305bc987a266dc06de26fcfab4b56a'
  const pushData = '6ab5b4fafc26de06dc66a287c95b308bb10a7c0e'

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes.length).toBe(2)
    expect(codes[0].asm()).toBe('OP_0')
    expect(codes[1].asm()).toBe(pushData)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([
      OP_CODES.OP_0,
      new OP_PUSHDATA(Buffer.from(pushData, 'hex'), 'big')
    ], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})

describe('P2WSH: [OP_0, OP_PUSHDATA<SHA256(script)>]', () => {
  const hex = '2200209e1be07558ea5cc8e02ed1d80c0911048afad949affa36d5c3951e3159dbea19'
  const pushData = '19eadb59311e95c3d536faaf49d9fa8a0411090cd8d12ee0c85cea5875e01b9e' // 32 bytes

  it('should map fromBuffer', () => {
    const codes = script.fromBufferToOpCodes(SmartBuffer.fromBuffer(
      Buffer.from(hex, 'hex')
    ))
    expect(codes.length).toBe(2)
    expect(codes[0].asm()).toBe('OP_0')
    expect(codes[1].asm().length).toBe(64)
    expect(codes[1].asm()).toBe(pushData)
  })

  it('should map toBuffer', () => {
    const smartBuffer = new SmartBuffer()
    script.fromOpCodesToBuffer([
      OP_CODES.OP_0,
      new OP_PUSHDATA(Buffer.from(pushData, 'hex'), 'big')
    ], smartBuffer)
    expect(smartBuffer.toBuffer().toString('hex')).toBe(hex)
  })
})
