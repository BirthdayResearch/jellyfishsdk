import * as constants from '../../src/script'
import { OP_CODES, OP_RIPEMD160 } from '../../src/script'

it('OP_UNMAPPED', () => {
  expect(constants.numAsOPCode(0xfe)).toBeInstanceOf(constants.OP_UNMAPPED)
  expect(constants.numAsOPCode(0xfe).type).toBe('OP_UNMAPPED_CODE_254')
  expect(constants.numAsOPCode(0xfe).asBuffer().toString('hex')).toBe('fe')
})

describe('All mapped OP_CODES are setup properly: (static, hex, num, asm)', () => {
  function expectOPCode (code: constants.StaticCode, instanceOf: any, type: string, num: number, hex: string): void {
    expect(code).toBeInstanceOf(instanceOf)
    expect(constants.numAsOPCode(num)).toBeInstanceOf(instanceOf)
    expect(code.type).toBe(type)
    expect(code.asBuffer().toString('hex')).toBe(hex)
  }

  it('OP_0', () => {
    expectOPCode(constants.OP_CODES.OP_0, constants.OP_0, 'OP_0', 0x00, '00')
  })

  it('OP_FALSE and it is always mapped as OP_0', () => {
    expectOPCode(constants.OP_CODES.OP_FALSE, constants.OP_0, 'OP_0', 0x00, '00')
  })

  it('OP_1NEGATE', () => {
    expectOPCode(constants.OP_CODES.OP_1NEGATE, constants.OP_1NEGATE, 'OP_1NEGATE', 0x4f, '4f')
  })

  it('OP_1', () => {
    expectOPCode(constants.OP_CODES.OP_1, constants.OP_1, 'OP_1', 0x51, '51')
  })

  it('OP_TRUE and it is always mapped as OP_1', () => {
    expectOPCode(constants.OP_CODES.OP_TRUE, constants.OP_1, 'OP_1', 0x51, '51')
  })

  it('OP_2', () => {
    expectOPCode(constants.OP_CODES.OP_2, constants.OP_2, 'OP_2', 0x52, '52')
  })

  it('OP_3', () => {
    expectOPCode(constants.OP_CODES.OP_3, constants.OP_3, 'OP_3', 0x53, '53')
  })

  it('OP_4', () => {
    expectOPCode(constants.OP_CODES.OP_4, constants.OP_4, 'OP_4', 0x54, '54')
  })

  it('OP_5', () => {
    expectOPCode(constants.OP_CODES.OP_5, constants.OP_5, 'OP_5', 0x55, '55')
  })

  it('OP_6', () => {
    expectOPCode(constants.OP_CODES.OP_6, constants.OP_6, 'OP_6', 0x56, '56')
  })

  it('OP_7', () => {
    expectOPCode(constants.OP_CODES.OP_7, constants.OP_7, 'OP_7', 0x57, '57')
  })

  it('OP_8', () => {
    expectOPCode(constants.OP_CODES.OP_8, constants.OP_8, 'OP_8', 0x58, '58')
  })

  it('OP_9', () => {
    expectOPCode(constants.OP_CODES.OP_9, constants.OP_9, 'OP_9', 0x59, '59')
  })

  it('OP_10', () => {
    expectOPCode(constants.OP_CODES.OP_10, constants.OP_10, 'OP_10', 0x5a, '5a')
  })

  it('OP_11', () => {
    expectOPCode(constants.OP_CODES.OP_11, constants.OP_11, 'OP_11', 0x5b, '5b')
  })

  it('OP_12', () => {
    expectOPCode(constants.OP_CODES.OP_12, constants.OP_12, 'OP_12', 0x5c, '5c')
  })

  it('OP_13', () => {
    expectOPCode(constants.OP_CODES.OP_13, constants.OP_13, 'OP_13', 0x5d, '5d')
  })

  it('OP_14', () => {
    expectOPCode(constants.OP_CODES.OP_14, constants.OP_14, 'OP_14', 0x5e, '5e')
  })

  it('OP_15', () => {
    expectOPCode(constants.OP_CODES.OP_15, constants.OP_15, 'OP_15', 0x5f, '5f')
  })

  it('OP_16', () => {
    expectOPCode(constants.OP_CODES.OP_16, constants.OP_16, 'OP_16', 0x60, '60')
  })

  it('OP_RETURN', () => {
    expectOPCode(constants.OP_CODES.OP_RETURN, constants.OP_RETURN, 'OP_RETURN', 0x6a, '6a')
  })

  it('OP_DUP', () => {
    expectOPCode(constants.OP_CODES.OP_DUP, constants.OP_DUP, 'OP_DUP', 0x76, '76')
  })

  it('OP_EQUAL', () => {
    expectOPCode(constants.OP_CODES.OP_EQUAL, constants.OP_EQUAL, 'OP_EQUAL', 0x87, '87')
  })

  it('OP_EQUALVERIFY', () => {
    expectOPCode(constants.OP_CODES.OP_EQUALVERIFY, constants.OP_EQUALVERIFY, 'OP_EQUALVERIFY', 0x88, '88')
  })

  it('OP_RIPEMD160', () => {
    expectOPCode(OP_CODES.OP_RIPEMD160, OP_RIPEMD160, 'OP_RIPEMD160', 0xa6, 'a6')
  })

  it('OP_HASH160', () => {
    expectOPCode(constants.OP_CODES.OP_HASH160, constants.OP_HASH160, 'OP_HASH160', 0xa9, 'a9')
  })

  it('OP_CHECKSIG', () => {
    expectOPCode(constants.OP_CODES.OP_CHECKSIG, constants.OP_CHECKSIG, 'OP_CHECKSIG', 0xac, 'ac')
  })
})
