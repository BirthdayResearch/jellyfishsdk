import { numAsOPCode, OP_0, OP_CODES, OP_FALSE, OP_RETURN, OP_UNMAPPED, StaticCode } from '../../src/script'
import { OP_DUP } from '../../src/script/stack'
import { OP_CHECKSIG, OP_HASH160 } from '../../src/script/crypto'
import { OP_EQUAL, OP_EQUALVERIFY } from '../../src/script/bitwise'

it('OP_UNMAPPED', () => {
  expect(numAsOPCode(0xfe)).toBeInstanceOf(OP_UNMAPPED)
  expect(numAsOPCode(0xfe).asm()).toBe('OP_UNMAPPED_CODE_254')
  expect(numAsOPCode(0xfe).asBuffer().toString('hex')).toBe('fe')
})

describe('All mapped OP_CODES are setup properly: (static, hex, num, asm)', () => {
  function expectOPCode (code: StaticCode, instanceOf: any, asm: string, num: number, hex: string): void {
    expect(code).toBeInstanceOf(instanceOf)
    expect(numAsOPCode(num)).toBeInstanceOf(instanceOf)
    expect(code.asm()).toBe(asm)
    expect(code.asBuffer().toString('hex')).toBe(hex)
  }

  it('OP_0', () => {
    expectOPCode(OP_CODES.OP_0, OP_0, 'OP_0', 0x00, '00')
  })

  it('OP_FALSE', () => {
    expect(OP_CODES.OP_FALSE).toBeInstanceOf(OP_FALSE)
    expect(numAsOPCode(0x00)).toBeInstanceOf(OP_0) // notice it's always mapped as OP_0
    expect(OP_CODES.OP_FALSE.asm()).toBe('OP_FALSE')
    expect(OP_CODES.OP_FALSE.asBuffer().toString('hex')).toBe('00')
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
