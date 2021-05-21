import * as script from '../../src/script'

it('OP_UNMAPPED', () => {
  expect(script.numAsOPCode(0xfe)).toBeInstanceOf(script.OP_UNMAPPED)
  expect(script.numAsOPCode(0xfe).type).toStrictEqual('OP_UNMAPPED_CODE_254')
  expect(script.numAsOPCode(0xfe).asBuffer().toString('hex')).toStrictEqual('fe')
})

describe('All mapped OP_CODES are setup properly: (static, hex, num, asm)', () => {
  function expectOPCode (code: script.StaticCode, instanceOf: any, type: string, num: number, hex: string): void {
    expect(code).toBeInstanceOf(instanceOf)
    expect(script.numAsOPCode(num)).toBeInstanceOf(instanceOf)
    expect(code.type).toStrictEqual(type)
    expect(code.asBuffer().toString('hex')).toStrictEqual(hex)
  }

  it('OP_0', () => {
    expectOPCode(script.OP_CODES.OP_0, script.OP_0, 'OP_0', 0x00, '00')
  })

  it('OP_FALSE and it is always mapped as OP_0', () => {
    expectOPCode(script.OP_CODES.OP_FALSE, script.OP_0, 'OP_0', 0x00, '00')
  })

  it('OP_1NEGATE', () => {
    expectOPCode(script.OP_CODES.OP_1NEGATE, script.OP_1NEGATE, 'OP_1NEGATE', 0x4f, '4f')
  })

  it('OP_RESERVED', () => {
    expectOPCode(script.OP_CODES.OP_RESERVED, script.OP_RESERVED, 'OP_RESERVED', 0x50, '50')
  })

  it('OP_1', () => {
    expectOPCode(script.OP_CODES.OP_1, script.OP_1, 'OP_1', 0x51, '51')
  })

  it('OP_TRUE and it is always mapped as OP_1', () => {
    expectOPCode(script.OP_CODES.OP_TRUE, script.OP_1, 'OP_1', 0x51, '51')
  })

  it('OP_2', () => {
    expectOPCode(script.OP_CODES.OP_2, script.OP_2, 'OP_2', 0x52, '52')
  })

  it('OP_3', () => {
    expectOPCode(script.OP_CODES.OP_3, script.OP_3, 'OP_3', 0x53, '53')
  })

  it('OP_4', () => {
    expectOPCode(script.OP_CODES.OP_4, script.OP_4, 'OP_4', 0x54, '54')
  })

  it('OP_5', () => {
    expectOPCode(script.OP_CODES.OP_5, script.OP_5, 'OP_5', 0x55, '55')
  })

  it('OP_6', () => {
    expectOPCode(script.OP_CODES.OP_6, script.OP_6, 'OP_6', 0x56, '56')
  })

  it('OP_7', () => {
    expectOPCode(script.OP_CODES.OP_7, script.OP_7, 'OP_7', 0x57, '57')
  })

  it('OP_8', () => {
    expectOPCode(script.OP_CODES.OP_8, script.OP_8, 'OP_8', 0x58, '58')
  })

  it('OP_9', () => {
    expectOPCode(script.OP_CODES.OP_9, script.OP_9, 'OP_9', 0x59, '59')
  })

  it('OP_10', () => {
    expectOPCode(script.OP_CODES.OP_10, script.OP_10, 'OP_10', 0x5a, '5a')
  })

  it('OP_11', () => {
    expectOPCode(script.OP_CODES.OP_11, script.OP_11, 'OP_11', 0x5b, '5b')
  })

  it('OP_12', () => {
    expectOPCode(script.OP_CODES.OP_12, script.OP_12, 'OP_12', 0x5c, '5c')
  })

  it('OP_13', () => {
    expectOPCode(script.OP_CODES.OP_13, script.OP_13, 'OP_13', 0x5d, '5d')
  })

  it('OP_14', () => {
    expectOPCode(script.OP_CODES.OP_14, script.OP_14, 'OP_14', 0x5e, '5e')
  })

  it('OP_15', () => {
    expectOPCode(script.OP_CODES.OP_15, script.OP_15, 'OP_15', 0x5f, '5f')
  })

  it('OP_16', () => {
    expectOPCode(script.OP_CODES.OP_16, script.OP_16, 'OP_16', 0x60, '60')
  })

  it('OP_RETURN', () => {
    expectOPCode(script.OP_CODES.OP_RETURN, script.OP_RETURN, 'OP_RETURN', 0x6a, '6a')
  })

  it('OP_DUP', () => {
    expectOPCode(script.OP_CODES.OP_DUP, script.OP_DUP, 'OP_DUP', 0x76, '76')
  })

  it('OP_EQUAL', () => {
    expectOPCode(script.OP_CODES.OP_EQUAL, script.OP_EQUAL, 'OP_EQUAL', 0x87, '87')
  })

  it('OP_EQUALVERIFY', () => {
    expectOPCode(script.OP_CODES.OP_EQUALVERIFY, script.OP_EQUALVERIFY, 'OP_EQUALVERIFY', 0x88, '88')
  })

  it('OP_RIPEMD160', () => {
    expectOPCode(script.OP_CODES.OP_RIPEMD160, script.OP_RIPEMD160, 'OP_RIPEMD160', 0xa6, 'a6')
  })

  it('OP_SHA1', () => {
    expectOPCode(script.OP_CODES.OP_SHA1, script.OP_SHA1, 'OP_SHA1', 0xa7, 'a7')
  })

  it('OP_SHA256', () => {
    expectOPCode(script.OP_CODES.OP_SHA256, script.OP_SHA256, 'OP_SHA256', 0xa8, 'a8')
  })

  it('OP_HASH160', () => {
    expectOPCode(script.OP_CODES.OP_HASH160, script.OP_HASH160, 'OP_HASH160', 0xa9, 'a9')
  })

  it('OP_HASH256', () => {
    expectOPCode(script.OP_CODES.OP_HASH256, script.OP_HASH256, 'OP_HASH256', 0xaa, 'aa')
  })

  it('OP_CODESEPARATOR', () => {
    expectOPCode(script.OP_CODES.OP_CODESEPARATOR, script.OP_CODESEPARATOR, 'OP_CODESEPARATOR', 0xab, 'ab')
  })

  it('OP_CHECKSIG', () => {
    expectOPCode(script.OP_CODES.OP_CHECKSIG, script.OP_CHECKSIG, 'OP_CHECKSIG', 0xac, 'ac')
  })

  it('OP_CHECKSIGVERIFY', () => {
    expectOPCode(script.OP_CODES.OP_CHECKSIGVERIFY, script.OP_CHECKSIGVERIFY, 'OP_CHECKSIGVERIFY', 0xad, 'ad')
  })

  it('OP_CHECKMULTISIG', () => {
    expectOPCode(script.OP_CODES.OP_CHECKMULTISIG, script.OP_CHECKMULTISIG, 'OP_CHECKMULTISIG', 0xae, 'ae')
  })

  it('OP_CHECKMULTISIGVERIFY', () => {
    expectOPCode(script.OP_CODES.OP_CHECKMULTISIGVERIFY, script.OP_CHECKMULTISIGVERIFY, 'OP_CHECKMULTISIGVERIFY', 0xaf, 'af')
  })
})
