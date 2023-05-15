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

  it('OP_FROMALTSTACK', () => {
    expectOPCode(script.OP_CODES.OP_FROMALTSTACK, script.OP_FROMALTSTACK, 'OP_FROMALTSTACK', 0x6c, '6c')
  })

  it('OP_2DROP', () => {
    expectOPCode(script.OP_CODES.OP_2DROP, script.OP_2DROP, 'OP_2DROP', 0x6d, '6d')
  })

  it('OP_2DUP', () => {
    expectOPCode(script.OP_CODES.OP_2DUP, script.OP_2DUP, 'OP_2DUP', 0x6e, '6e')
  })

  it('OP_3DUP', () => {
    expectOPCode(script.OP_CODES.OP_3DUP, script.OP_3DUP, 'OP_3DUP', 0x6f, '6f')
  })

  it('OP_2OVER', () => {
    expectOPCode(script.OP_CODES.OP_2OVER, script.OP_2OVER, 'OP_2OVER', 0x70, '70')
  })

  it('OP_2ROT', () => {
    expectOPCode(script.OP_CODES.OP_2ROT, script.OP_2ROT, 'OP_2ROT', 0x71, '71')
  })

  it('OP_2SWAP', () => {
    expectOPCode(script.OP_CODES.OP_2SWAP, script.OP_2SWAP, 'OP_2SWAP', 0x72, '72')
  })

  it('OP_IFDUP', () => {
    expectOPCode(script.OP_CODES.OP_IFDUP, script.OP_IFDUP, 'OP_IFDUP', 0x73, '73')
  })

  it('OP_DEPTH', () => {
    expectOPCode(script.OP_CODES.OP_DEPTH, script.OP_DEPTH, 'OP_DEPTH', 0x74, '74')
  })

  it('OP_DROP', () => {
    expectOPCode(script.OP_CODES.OP_DROP, script.OP_DROP, 'OP_DROP', 0x75, '75')
  })

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

  it('OP_ROT', () => {
    expectOPCode(script.OP_CODES.OP_ROT, script.OP_ROT, 'OP_ROT', 0x7b, '7b')
  })

  it('OP_SWAP', () => {
    expectOPCode(script.OP_CODES.OP_SWAP, script.OP_SWAP, 'OP_SWAP', 0x7c, '7c')
  })

  it('OP_TUCK', () => {
    expectOPCode(script.OP_CODES.OP_TUCK, script.OP_TUCK, 'OP_TUCK', 0x7d, '7d')
  })

  it('OP_CAT', () => {
    expectOPCode(script.OP_CODES.OP_CAT, script.OP_CAT, 'OP_CAT', 0x7e, '7e')
  })

  it('OP_SUBSTR', () => {
    expectOPCode(script.OP_CODES.OP_SUBSTR, script.OP_SUBSTR, 'OP_SUBSTR', 0x7f, '7f')
  })

  it('OP_LEFT', () => {
    expectOPCode(script.OP_CODES.OP_LEFT, script.OP_LEFT, 'OP_LEFT', 0x80, '80')
  })

  it('OP_RIGHT', () => {
    expectOPCode(script.OP_CODES.OP_RIGHT, script.OP_RIGHT, 'OP_RIGHT', 0x81, '81')
  })

  it('OP_SIZE', () => {
    expectOPCode(script.OP_CODES.OP_SIZE, script.OP_SIZE, 'OP_SIZE', 0x82, '82')
  })

  it('OP_INVERT', () => {
    expectOPCode(script.OP_CODES.OP_INVERT, script.OP_INVERT, 'OP_INVERT', 0x83, '83')
  })

  it('OP_AND', () => {
    expectOPCode(script.OP_CODES.OP_AND, script.OP_AND, 'OP_AND', 0x84, '84')
  })

  it('OP_OR', () => {
    expectOPCode(script.OP_CODES.OP_OR, script.OP_OR, 'OP_OR', 0x85, '85')
  })

  it('OP_XOR', () => {
    expectOPCode(script.OP_CODES.OP_XOR, script.OP_XOR, 'OP_XOR', 0x86, '86')
  })

  it('OP_EQUAL', () => {
    expectOPCode(script.OP_CODES.OP_EQUAL, script.OP_EQUAL, 'OP_EQUAL', 0x87, '87')
  })

  it('OP_EQUALVERIFY', () => {
    expectOPCode(script.OP_CODES.OP_EQUALVERIFY, script.OP_EQUALVERIFY, 'OP_EQUALVERIFY', 0x88, '88')
  })

  it('OP_RESERVED1', () => {
    expectOPCode(script.OP_CODES.OP_RESERVED1, script.OP_RESERVED1, 'OP_RESERVED1', 0x89, '89')
  })

  it('OP_RESERVED2', () => {
    expectOPCode(script.OP_CODES.OP_RESERVED2, script.OP_RESERVED2, 'OP_RESERVED2', 0x8a, '8a')
  })

  it('OP_1ADD', () => {
    expectOPCode(script.OP_CODES.OP_1ADD, script.OP_1ADD, 'OP_1ADD', 0x8b, '8b')
  })

  it('OP_1SUB', () => {
    expectOPCode(script.OP_CODES.OP_1SUB, script.OP_1SUB, 'OP_1SUB', 0x8c, '8c')
  })

  it('OP_2MUL', () => {
    expectOPCode(script.OP_CODES.OP_2MUL, script.OP_2MUL, 'OP_2MUL', 0x8d, '8d')
  })

  it('OP_2DIV', () => {
    expectOPCode(script.OP_CODES.OP_2DIV, script.OP_2DIV, 'OP_2DIV', 0x8e, '8e')
  })

  it('OP_NEGATE', () => {
    expectOPCode(script.OP_CODES.OP_NEGATE, script.OP_NEGATE, 'OP_NEGATE', 0x8f, '8f')
  })

  it('OP_ABS', () => {
    expectOPCode(script.OP_CODES.OP_ABS, script.OP_ABS, 'OP_ABS', 0x90, '90')
  })

  it('OP_NOT', () => {
    expectOPCode(script.OP_CODES.OP_NOT, script.OP_NOT, 'OP_NOT', 0x91, '91')
  })

  it('OP_0NOTEQUAL', () => {
    expectOPCode(script.OP_CODES.OP_0NOTEQUAL, script.OP_0NOTEQUAL, 'OP_0NOTEQUAL', 0x92, '92')
  })

  it('OP_ADD', () => {
    expectOPCode(script.OP_CODES.OP_ADD, script.OP_ADD, 'OP_ADD', 0x93, '93')
  })

  it('OP_SUB', () => {
    expectOPCode(script.OP_CODES.OP_SUB, script.OP_SUB, 'OP_SUB', 0x94, '94')
  })

  it('OP_MUL', () => {
    expectOPCode(script.OP_CODES.OP_MUL, script.OP_MUL, 'OP_MUL', 0x95, '95')
  })

  it('OP_DIV', () => {
    expectOPCode(script.OP_CODES.OP_DIV, script.OP_DIV, 'OP_DIV', 0x96, '96')
  })

  it('OP_MOD', () => {
    expectOPCode(script.OP_CODES.OP_MOD, script.OP_MOD, 'OP_MOD', 0x97, '97')
  })

  it('OP_LSHIFT', () => {
    expectOPCode(script.OP_CODES.OP_LSHIFT, script.OP_LSHIFT, 'OP_LSHIFT', 0x98, '98')
  })

  it('OP_RSHIFT', () => {
    expectOPCode(script.OP_CODES.OP_RSHIFT, script.OP_RSHIFT, 'OP_RSHIFT', 0x99, '99')
  })

  it('OP_BOOLAND', () => {
    expectOPCode(script.OP_CODES.OP_BOOLAND, script.OP_BOOLAND, 'OP_BOOLAND', 0x9a, '9a')
  })

  it('OP_BOOLOR', () => {
    expectOPCode(script.OP_CODES.OP_BOOLOR, script.OP_BOOLOR, 'OP_BOOLOR', 0x9b, '9b')
  })

  it('OP_NUMEQUAL', () => {
    expectOPCode(script.OP_CODES.OP_NUMEQUAL, script.OP_NUMEQUAL, 'OP_NUMEQUAL', 0x9c, '9c')
  })

  it('OP_NUMEQUALVERIFY', () => {
    expectOPCode(script.OP_CODES.OP_NUMEQUALVERIFY, script.OP_NUMEQUALVERIFY, 'OP_NUMEQUALVERIFY', 0x9d, '9d')
  })

  it('OP_NUMNOTEQUAL', () => {
    expectOPCode(script.OP_CODES.OP_NUMNOTEQUAL, script.OP_NUMNOTEQUAL, 'OP_NUMNOTEQUAL', 0x9e, '9e')
  })

  it('OP_LESSTHAN', () => {
    expectOPCode(script.OP_CODES.OP_LESSTHAN, script.OP_LESSTHAN, 'OP_LESSTHAN', 0x9f, '9f')
  })

  it('OP_GREATERTHAN', () => {
    expectOPCode(script.OP_CODES.OP_GREATERTHAN, script.OP_GREATERTHAN, 'OP_GREATERTHAN', 0xa0, 'a0')
  })

  it('OP_LESSTHANOREQUAL', () => {
    expectOPCode(script.OP_CODES.OP_LESSTHANOREQUAL, script.OP_LESSTHANOREQUAL, 'OP_LESSTHANOREQUAL', 0xa1, 'a1')
  })

  it('OP_GREATERTHANOREQUAL', () => {
    expectOPCode(script.OP_CODES.OP_GREATERTHANOREQUAL, script.OP_GREATERTHANOREQUAL, 'OP_GREATERTHANOREQUAL', 0xa2, 'a2')
  })

  it('OP_MIN', () => {
    expectOPCode(script.OP_CODES.OP_MIN, script.OP_MIN, 'OP_MIN', 0xa3, 'a3')
  })

  it('OP_MAX', () => {
    expectOPCode(script.OP_CODES.OP_MAX, script.OP_MAX, 'OP_MAX', 0xa4, 'a4')
  })

  it('OP_WITHIN', () => {
    expectOPCode(script.OP_CODES.OP_WITHIN, script.OP_WITHIN, 'OP_WITHIN', 0xa5, 'a5')
  })

  it('OP_RIPEMD160', () => {
    expectOPCode(script.OP_CODES.OP_RIPEMD160, script.OP_RIPEMD160, 'OP_RIPEMD160', 0xa6, 'a6')
  })

  it('OP_SHA1', () => {
    expectOPCode(script.OP_CODES.OP_SHA1, script.OP_SHA1, 'OP_SHA1', 0xa7, 'a7')
  })

  it('OP_SHA3', () => {
    expectOPCode(script.OP_CODES.OP_SHA3, script.OP_SHA3, 'OP_SHA3', 0xc0, 'c0')
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

  it('OP_NOP1', () => {
    expectOPCode(script.OP_CODES.OP_NOP1, script.OP_NOP1, 'OP_NOP1', 0xb0, 'b0')
  })

  it('OP_CHECKLOCKTIMEVERIFY', () => {
    expectOPCode(script.OP_CODES.OP_CHECKLOCKTIMEVERIFY, script.OP_CHECKLOCKTIMEVERIFY, 'OP_CHECKLOCKTIMEVERIFY', 0xb1, 'b1')
  })

  it('OP_NOP2', () => {
    expectOPCode(script.OP_CODES.OP_NOP2, script.OP_CHECKLOCKTIMEVERIFY, 'OP_CHECKLOCKTIMEVERIFY', 0xb1, 'b1')
  })

  it('OP_CHECKSEQUENCEVERIFY', () => {
    expectOPCode(script.OP_CODES.OP_CHECKSEQUENCEVERIFY, script.OP_CHECKSEQUENCEVERIFY, 'OP_CHECKSEQUENCEVERIFY', 0xb2, 'b2')
  })

  it('OP_NOP3', () => {
    expectOPCode(script.OP_CODES.OP_NOP3, script.OP_CHECKSEQUENCEVERIFY, 'OP_CHECKSEQUENCEVERIFY', 0xb2, 'b2')
  })

  it('OP_NOP4', () => {
    expectOPCode(script.OP_CODES.OP_NOP4, script.OP_NOP4, 'OP_NOP4', 0xb3, 'b3')
  })

  it('OP_NOP5', () => {
    expectOPCode(script.OP_CODES.OP_NOP5, script.OP_NOP5, 'OP_NOP5', 0xb4, 'b4')
  })

  it('OP_NOP6', () => {
    expectOPCode(script.OP_CODES.OP_NOP6, script.OP_NOP6, 'OP_NOP6', 0xb5, 'b5')
  })

  it('OP_NOP7', () => {
    expectOPCode(script.OP_CODES.OP_NOP7, script.OP_NOP7, 'OP_NOP7', 0xb6, 'b6')
  })

  it('OP_NOP8', () => {
    expectOPCode(script.OP_CODES.OP_NOP8, script.OP_NOP8, 'OP_NOP8', 0xb7, 'b7')
  })

  it('OP_NOP9', () => {
    expectOPCode(script.OP_CODES.OP_NOP9, script.OP_NOP9, 'OP_NOP9', 0xb8, 'b8')
  })

  it('OP_NOP10', () => {
    expectOPCode(script.OP_CODES.OP_NOP10, script.OP_NOP10, 'OP_NOP10', 0xb9, 'b9')
  })

  it('OP_INVALIDOPCODE', () => {
    expectOPCode(script.OP_CODES.OP_INVALIDOPCODE, script.OP_INVALIDOPCODE, 'OP_INVALIDOPCODE', 0xff, 'ff')
  })
})
