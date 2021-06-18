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

  it('OP_NOP', () => {
    expectOPCode(script.OP_CODES.OP_NOP, script.OP_NOP, 'OP_NOP', 0x61, '61')
  })

  it('OP_VER', () => {
    expectOPCode(script.OP_CODES.OP_VER, script.OP_VER, 'OP_VER', 0x62, '62')
  })

  it('OP_IF', () => {
    expectOPCode(script.OP_CODES.OP_IF, script.OP_IF, 'OP_IF', 0x63, '63')
  })

  it('OP_NOTIF', () => {
    expectOPCode(script.OP_CODES.OP_NOTIF, script.OP_NOTIF, 'OP_NOTIF', 0x64, '64')
  })

  it('OP_VERIF', () => {
    expectOPCode(script.OP_CODES.OP_VERIF, script.OP_VERIF, 'OP_VERIF', 0x65, '65')
  })

  it('OP_VERNOTIF', () => {
    expectOPCode(script.OP_CODES.OP_VERNOTIF, script.OP_VERNOTIF, 'OP_VERNOTIF', 0x66, '66')
  })

  it('OP_ELSE', () => {
    expectOPCode(script.OP_CODES.OP_ELSE, script.OP_ELSE, 'OP_ELSE', 0x67, '67')
  })

  it('OP_ENDIF', () => {
    expectOPCode(script.OP_CODES.OP_ENDIF, script.OP_ENDIF, 'OP_ENDIF', 0x68, '68')
  })

  it('OP_VERIFY', () => {
    expectOPCode(script.OP_CODES.OP_VERIFY, script.OP_VERIFY, 'OP_VERIFY', 0x69, '69')
  })

  it('OP_RETURN', () => {
    expectOPCode(script.OP_CODES.OP_RETURN, script.OP_RETURN, 'OP_RETURN', 0x6a, '6a')
  })

  it('OP_TOALTSTACK', () => {
    expectOPCode(script.OP_CODES.OP_TOALTSTACK, script.OP_TOALTSTACK, 'OP_TOALTSTACK', 0x6b, '6b')
  })

  it('OP_FROMALTSTACK', () => { expectOPCode(script.OP_CODES.OP_FROMALTSTACK, script.OP_FROMALTSTACK, 'OP_FROMALTSTACK', 0x6c, '6c') })

  it('OP_2DROP', () => { expectOPCode(script.OP_CODES.OP_2DROP, script.OP_2DROP, 'OP_2DROP', 0x6d, '6d') })

  it('OP_3DUP', () => { expectOPCode(script.OP_CODES.OP_3DUP, script.OP_3DUP, 'OP_3DUP', 0x6f, '6f') })

  it('OP_2OVER', () => { expectOPCode(script.OP_CODES.OP_2OVER, script.OP_2OVER, 'OP_2OVER', 0x70, '70') })

  it('OP_2ROT', () => { expectOPCode(script.OP_CODES.OP_2ROT, script.OP_2ROT, 'OP_2ROT', 0x71, '71') })

  it('OP_2SWAP', () => { expectOPCode(script.OP_CODES.OP_2SWAP, script.OP_2SWAP, 'OP_2SWAP', 0x72, '72') })

  it('OP_IFDUP', () => { expectOPCode(script.OP_CODES.OP_IFDUP, script.OP_IFDUP, 'OP_IFDUP', 0x73, '73') })

  it('OP_DEPTH', () => { expectOPCode(script.OP_CODES.OP_DEPTH, script.OP_DEPTH, 'OP_DEPTH', 0x74, '74') })

  it('OP_DROP', () => { expectOPCode(script.OP_CODES.OP_DROP, script.OP_DROP, 'OP_DROP', 0x75, '75') })

  it('OP_DUP', () => {
    expectOPCode(script.OP_CODES.OP_DUP, script.OP_DUP, 'OP_DUP', 0x76, '76')
  })

  it('OP_NIP', () => {
    expectOPCode(script.OP_CODES.OP_NIP, script.OP_NIP, 'OP_NIP', 0x77, '77')
  })

  it('OP_OVER', () => {
    expectOPCode(script.OP_CODES.OP_OVER, script.OP_OVER, 'OP_OVER', 0x78, '78')
  })

  it('OP_PICK', () => {
    expectOPCode(script.OP_CODES.OP_PICK, script.OP_PICK, 'OP_PICK', 0x79, '79')
  })

  it('OP_ROLL', () => {
    expectOPCode(script.OP_CODES.OP_ROLL, script.OP_ROLL, 'OP_ROLL', 0x7a, '7a')
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
