import { OP_0, OP_FALSE } from './constants'
import { OP_RETURN } from './control'
import { StaticCode } from './opcode'
import { OP_DUP } from './stack'
import { OP_CHECKSIG, OP_HASH160 } from './crypto'
import { OP_EQUAL, OP_EQUALVERIFY } from './bitwise'
import { OP_PUSHDATA } from './data'
import { CDfTx, DfTx } from './defi/dftx'
import { OP_DEFI_TX } from './defi'
import { CPoolSwap, PoolSwap } from './defi/dftx_pool'

/**
 * @param num to map as OPCode, 1 byte long
 */
export function numAsOPCode (num: number): StaticCode {
  if (num > 0xff) {
    throw new Error('OPCode should be 1 byte.')
  }

  const opCode = HEX_MAPPING[num]
  if (opCode !== undefined) {
    return opCode
  }

  return new OP_UNMAPPED(num)
}

/**
 * Unmapped OPCode are codes that don't yet have a class for it yet.
 */
export class OP_UNMAPPED extends StaticCode {
  constructor (code: number) {
    super(code, `OP_UNMAPPED_CODE_${code.toString()}`)
  }
}

/**
 * All static OP_CODES & DEFI Custom Tx scripting
 * @see https://github.com/DeFiCh/ain/blob/master/src/script/script.h
 */
export const OP_CODES = {
  OP_DEFI_TX: (dftx: DfTx<any>): OP_DEFI_TX => {
    return new OP_DEFI_TX(dftx)
  },
  OP_DEFI_TX_POOL_SWAP: (poolSwap: PoolSwap): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE, type: CPoolSwap.OP_CODE, name: CPoolSwap.OP_NAME, data: poolSwap
    })
  },
  OP_0: new OP_0(),
  OP_FALSE: new OP_FALSE(),
  /**
   * OP_PUSHDATA1 use OP_PUSHDATA
   * OP_PUSHDATA2 use OP_PUSHDATA
   * OP_PUSHDATA4 use OP_PUSHDATA
   */
  OP_PUSHDATA: (buffer: Buffer, endian: 'little' | 'big'): OP_PUSHDATA => {
    return new OP_PUSHDATA(buffer, endian)
  },

  // TODO: to map everything as class
  //  to be separated into concerns, stack, arithmetic, crypto, etc...

  //  OP_1NEGATE = 0x4f,
  //  OP_RESERVED = 0x50,
  //  OP_1 = 0x51,
  //  OP_TRUE=OP_1,
  //  OP_2 = 0x52,
  //  OP_3 = 0x53,
  //  OP_4 = 0x54,
  //  OP_5 = 0x55,
  //  OP_6 = 0x56,
  //  OP_7 = 0x57,
  //  OP_8 = 0x58,
  //  OP_9 = 0x59,
  //  OP_10 = 0x5a,
  //  OP_11 = 0x5b,
  //  OP_12 = 0x5c,
  //  OP_13 = 0x5d,
  //  OP_14 = 0x5e,
  //  OP_15 = 0x5f,
  //  OP_16 = 0x60,

  // control
  //  OP_NOP = 0x61,
  //  OP_VER = 0x62,
  //  OP_IF = 0x63,
  //  OP_NOTIF = 0x64,
  //  OP_VERIF = 0x65,
  //  OP_VERNOTIF = 0x66,
  //  OP_ELSE = 0x67,
  //  OP_ENDIF = 0x68,
  //  OP_VERIFY = 0x69,
  OP_RETURN: new OP_RETURN(),

  // stack
  //  OP_TOALTSTACK = 0x6b,
  //  OP_FROMALTSTACK = 0x6c,
  //  OP_2DROP = 0x6d,
  //  OP_2DUP = 0x6e,
  //  OP_3DUP = 0x6f,
  //  OP_2OVER = 0x70,
  //  OP_2ROT = 0x71,
  //  OP_2SWAP = 0x72,
  //  OP_IFDUP = 0x73,
  //  OP_DEPTH = 0x74,
  //  OP_DROP = 0x75,
  OP_DUP: new OP_DUP(),
  //  OP_NIP = 0x77,
  //  OP_OVER = 0x78,
  //  OP_PICK = 0x79,
  //  OP_ROLL = 0x7a,
  //  OP_ROT = 0x7b,
  //  OP_SWAP = 0x7c,
  //  OP_TUCK = 0x7d,

  // splice ops
  //  OP_CAT = 0x7e,
  //  OP_SUBSTR = 0x7f,
  //  OP_LEFT = 0x80,
  //  OP_RIGHT = 0x81,
  //  OP_SIZE = 0x82,

  // bitwise
  //  OP_INVERT = 0x83,
  //  OP_AND = 0x84,
  //  OP_OR = 0x85,
  //  OP_XOR = 0x86,
  OP_EQUAL: new OP_EQUAL(),
  OP_EQUALVERIFY: new OP_EQUALVERIFY(),
  //  OP_RESERVED1 = 0x89,
  //  OP_RESERVED2 = 0x8a,

  // numeric
  //  OP_1ADD = 0x8b,
  //  OP_1SUB = 0x8c,
  //  OP_2MUL = 0x8d,
  //  OP_2DIV = 0x8e,
  //  OP_NEGATE = 0x8f,
  //  OP_ABS = 0x90,
  //  OP_NOT = 0x91,
  //  OP_0NOTEQUAL = 0x92,
  //  OP_ADD = 0x93,
  //  OP_SUB = 0x94,
  //  OP_MUL = 0x95,
  //  OP_DIV = 0x96,
  //  OP_MOD = 0x97,
  //  OP_LSHIFT = 0x98,
  //  OP_RSHIFT = 0x99,
  //  OP_BOOLAND = 0x9a,
  //  OP_BOOLOR = 0x9b,
  //  OP_NUMEQUAL = 0x9c,
  //  OP_NUMEQUALVERIFY = 0x9d,
  //  OP_NUMNOTEQUAL = 0x9e,
  //  OP_LESSTHAN = 0x9f,
  //  OP_GREATERTHAN = 0xa0,
  //  OP_LESSTHANOREQUAL = 0xa1,
  //  OP_GREATERTHANOREQUAL = 0xa2,
  //  OP_MIN = 0xa3,
  //  OP_MAX = 0xa4,
  //  OP_WITHIN = 0xa5,

  // crypto
  //  OP_RIPEMD160 = 0xa6,
  //  OP_SHA1 = 0xa7,
  //  OP_SHA256 = 0xa8,
  OP_HASH160: new OP_HASH160(),
  //  OP_HASH256 = 0xaa,
  //  OP_CODESEPARATOR = 0xab,
  OP_CHECKSIG: new OP_CHECKSIG()
  //  OP_CHECKSIGVERIFY = 0xad,
  //  OP_CHECKMULTISIG = 0xae,
  //  OP_CHECKMULTISIGVERIFY = 0xaf,

  // expansion
  //  OP_NOP1 = 0xb0,
  //  OP_CHECKLOCKTIMEVERIFY = 0xb1,
  //  OP_NOP2 = OP_CHECKLOCKTIMEVERIFY,
  //  OP_CHECKSEQUENCEVERIFY = 0xb2,
  //  OP_NOP3 = OP_CHECKSEQUENCEVERIFY,
  //  OP_NOP4 = 0xb3,
  //  OP_NOP5 = 0xb4,
  //  OP_NOP6 = 0xb5,
  //  OP_NOP7 = 0xb6,
  //  OP_NOP8 = 0xb7,
  //  OP_NOP9 = 0xb8,
  //  OP_NOP10 = 0xb9,

  // invalid
  //  OP_INVALIDOPCODE = 0xff,
}

/**
 * Hex code mapping of all static OP_CODES
 */
const HEX_MAPPING: {
  [n: number]: StaticCode
} = {
  0x00: OP_CODES.OP_0,
  // control
  0x6a: OP_CODES.OP_RETURN,
  // stack
  0x76: OP_CODES.OP_DUP,
  // bitwise
  0x87: OP_CODES.OP_EQUAL,
  0x88: OP_CODES.OP_EQUALVERIFY,
  // crypto
  0xa9: OP_CODES.OP_HASH160,
  0xac: OP_CODES.OP_CHECKSIG
}
