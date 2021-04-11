import { numAsOPCode, OP_0, OP_CODES, OP_FALSE, OP_RETURN, OP_UNMAPPED } from '../../src/script'

it('OP_UNMAPPED', () => {
  expect(numAsOPCode(0xfe)).toBeInstanceOf(OP_UNMAPPED)
  expect(numAsOPCode(0xfe).asm()).toBe('OP_UNMAPPED_CODE_254')
  expect(numAsOPCode(0xfe).asBuffer().toString('hex')).toBe('fe')
})

describe('All mapped OP_CODES are setup properly: (static, hex, num, asm)', () => {
  it('OP_0', () => {
    expect(OP_CODES.OP_0).toBeInstanceOf(OP_0)
    expect(numAsOPCode(0x00)).toBeInstanceOf(OP_0)
    expect(OP_CODES.OP_0.asm()).toBe('OP_0')
    expect(OP_CODES.OP_0.asBuffer().toString('hex')).toBe('00')
  })

  it('OP_FALSE', () => {
    expect(OP_CODES.OP_FALSE).toBeInstanceOf(OP_FALSE)
    expect(numAsOPCode(0x00)).toBeInstanceOf(OP_0) // notice it's always mapped as OP_0
    expect(OP_CODES.OP_FALSE.asm()).toBe('OP_FALSE')
    expect(OP_CODES.OP_FALSE.asBuffer().toString('hex')).toBe('00')
  })

  it('OP_RETURN', () => {
    expect(OP_CODES.OP_RETURN).toBeInstanceOf(OP_RETURN)
    expect(numAsOPCode(0x6a)).toBeInstanceOf(OP_RETURN)
    expect(OP_CODES.OP_RETURN.asm()).toBe('OP_RETURN')
    expect(OP_CODES.OP_RETURN.asBuffer().toString('hex')).toBe('6a')
  })
})
