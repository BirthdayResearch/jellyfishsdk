import {
  numAsOPCode,
  OP_0,
  OP_1NEGATE,
  OP_1,
  OP_2,
  OP_3,
  OP_4,
  OP_5,
  OP_6,
  OP_7,
  OP_8,
  OP_9,
  OP_10,
  OP_11,
  OP_12,
  OP_13,
  OP_14,
  OP_15,
  OP_16,
  OP_CODES,
  OP_RETURN,
  OP_UNMAPPED,
  StaticCode,
  OP_DUP,
  OP_CHECKSIG,
  OP_HASH160,
  OP_EQUAL,
  OP_EQUALVERIFY
} from '../../src/script'

it('OP_UNMAPPED', () => {
  expect(numAsOPCode(0xfe)).toBeInstanceOf(OP_UNMAPPED)
  expect(numAsOPCode(0xfe).type).toBe('OP_UNMAPPED_CODE_254')
  expect(numAsOPCode(0xfe).asBuffer().toString('hex')).toBe('fe')
})

describe('All mapped OP_CODES are setup properly: (static, hex, num, asm)', () => {
  function expectOPCode (code: StaticCode, instanceOf: any, type: string, num: number, hex: string): void {
    expect(code).toBeInstanceOf(instanceOf)
    expect(numAsOPCode(num)).toBeInstanceOf(instanceOf)
    expect(code.type).toBe(type)
    expect(code.asBuffer().toString('hex')).toBe(hex)
  }

  it('OP_0', () => {
    expectOPCode(OP_CODES.OP_0, OP_0, 'OP_0', 0x00, '00')
  })

  it('OP_FALSE and it is always mapped as OP_0', () => {
    expectOPCode(OP_CODES.OP_FALSE, OP_0, 'OP_0', 0x00, '00')
  })

  it('OP_1NEGATE', () => {
    expectOPCode(OP_CODES.OP_1NEGATE, OP_1NEGATE, 'OP_1NEGATE', 0x4f, '4f')
  })

  it('OP_1', () => {
    expectOPCode(OP_CODES.OP_1, OP_1, 'OP_1', 0x51, '51')
  })

  it('OP_TRUE and it is always mapped as OP_1', () => {
    expectOPCode(OP_CODES.OP_TRUE, OP_1, 'OP_1', 0x51, '51')
  })

  it('OP_2', () => {
    expectOPCode(OP_CODES.OP_2, OP_2, 'OP_2', 0x52, '52')
  })

  it('OP_3', () => {
    expectOPCode(OP_CODES.OP_3, OP_3, 'OP_3', 0x53, '53')
  })

  it('OP_4', () => {
    expectOPCode(OP_CODES.OP_4, OP_4, 'OP_4', 0x54, '54')
  })

  it('OP_5', () => {
    expectOPCode(OP_CODES.OP_5, OP_5, 'OP_5', 0x55, '55')
  })

  it('OP_6', () => {
    expectOPCode(OP_CODES.OP_6, OP_6, 'OP_6', 0x56, '56')
  })

  it('OP_7', () => {
    expectOPCode(OP_CODES.OP_7, OP_7, 'OP_7', 0x57, '57')
  })

  it('OP_8', () => {
    expectOPCode(OP_CODES.OP_8, OP_8, 'OP_8', 0x58, '58')
  })

  it('OP_9', () => {
    expectOPCode(OP_CODES.OP_9, OP_9, 'OP_9', 0x59, '59')
  })

  it('OP_10', () => {
    expectOPCode(OP_CODES.OP_10, OP_10, 'OP_10', 0x5a, '5a')
  })

  it('OP_11', () => {
    expectOPCode(OP_CODES.OP_11, OP_11, 'OP_11', 0x5b, '5b')
  })

  it('OP_12', () => {
    expectOPCode(OP_CODES.OP_12, OP_12, 'OP_12', 0x5c, '5c')
  })

  it('OP_13', () => {
    expectOPCode(OP_CODES.OP_13, OP_13, 'OP_13', 0x5d, '5d')
  })

  it('OP_14', () => {
    expectOPCode(OP_CODES.OP_14, OP_14, 'OP_14', 0x5e, '5e')
  })

  it('OP_15', () => {
    expectOPCode(OP_CODES.OP_15, OP_15, 'OP_15', 0x5f, '5f')
  })

  it('OP_16', () => {
    expectOPCode(OP_CODES.OP_16, OP_16, 'OP_16', 0x60, '60')
  })

  it('OP_RETURN', () => {
    expectOPCode(OP_CODES.OP_RETURN, OP_RETURN, 'OP_RETURN', 0x6a, '6a')
  })

  it('OP_DUP', () => {
    expectOPCode(OP_CODES.OP_DUP, OP_DUP, 'OP_DUP', 0x76, '76')
  })

  it('OP_EQUAL', () => {
    expectOPCode(OP_CODES.OP_EQUAL, OP_EQUAL, 'OP_EQUAL', 0x87, '87')
  })

  it('OP_EQUALVERIFY', () => {
    expectOPCode(OP_CODES.OP_EQUALVERIFY, OP_EQUALVERIFY, 'OP_EQUALVERIFY', 0x88, '88')
  })

  it('OP_HASH160', () => {
    expectOPCode(OP_CODES.OP_HASH160, OP_HASH160, 'OP_HASH160', 0xa9, 'a9')
  })

  it('OP_CHECKSIG', () => {
    expectOPCode(OP_CODES.OP_CHECKSIG, OP_CHECKSIG, 'OP_CHECKSIG', 0xac, 'ac')
  })
})
