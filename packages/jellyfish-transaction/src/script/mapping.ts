import * as constants from './constants'
import { OP_RETURN } from './control'
import { StaticCode } from './opcode'
import { OP_DUP } from './stack'
import { OP_CHECKSIG, OP_HASH160 } from './crypto'
import { OP_EQUAL, OP_EQUALVERIFY } from './bitwise'
import { OP_PUSHDATA } from './data'
import { CDfTx, DfTx } from './defi/dftx'
import { OP_DEFI_TX } from './defi'
import {
  CPoolAddLiquidity,
  CPoolRemoveLiquidity,
  CPoolSwap,
  PoolAddLiquidity,
  PoolRemoveLiquidity,
  PoolSwap
} from './defi/dftx_pool'
import { CTokenMint, TokenMint } from './defi/dftx_token'
import {
  AccountToAccount,
  AccountToUtxos,
  AnyAccountToAccount,
  CAccountToAccount,
  CAccountToUtxos,
  CAnyAccountToAccount,
  CUtxosToAccount,
  UtxosToAccount
} from './defi/dftx_account'

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
      signature: CDfTx.SIGNATURE,
      type: CPoolSwap.OP_CODE,
      name: CPoolSwap.OP_NAME,
      data: poolSwap
    })
  },
  OP_DEFI_TX_POOL_ADD_LIQUIDITY: (poolAddLiquidity: PoolAddLiquidity): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CPoolAddLiquidity.OP_CODE,
      name: CPoolAddLiquidity.OP_NAME,
      data: poolAddLiquidity
    })
  },
  OP_DEFI_TX_POOL_REMOVE_LIQUIDITY: (poolRemoveLiquidity: PoolRemoveLiquidity): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CPoolRemoveLiquidity.OP_CODE,
      name: CPoolRemoveLiquidity.OP_NAME,
      data: poolRemoveLiquidity
    })
  },
  OP_DEFI_TX_TOKEN_MINT: (tokenMint: TokenMint): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CTokenMint.OP_CODE,
      name: CTokenMint.OP_NAME,
      data: tokenMint
    })
  },
  DEFI_OP_UTXOS_TO_ACCOUNT: (utxosToAccount: UtxosToAccount): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CUtxosToAccount.OP_CODE,
      name: CUtxosToAccount.OP_NAME,
      data: utxosToAccount
    })
  },
  DEFI_OP_ACCOUNT_TO_UTXOS: (accountToUtxos: AccountToUtxos): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CAccountToUtxos.OP_CODE,
      name: CAccountToUtxos.OP_NAME,
      data: accountToUtxos
    })
  },
  DEFI_OP_ACCOUNT_TO_ACCOUNT: (accountToAccount: AccountToAccount): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CAccountToAccount.OP_CODE,
      name: CAccountToAccount.OP_NAME,
      data: accountToAccount
    })
  },
  DEFI_OP_ANY_ACCOUNT_TO_ACCOUNT: (anyAccountToAccount: AnyAccountToAccount): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CAnyAccountToAccount.OP_CODE,
      name: CAnyAccountToAccount.OP_NAME,
      data: anyAccountToAccount
    })
  },
  OP_0: new constants.OP_0(),
  OP_FALSE: new constants.OP_FALSE(),
  /**
   * OP_PUSHDATA1 use OP_PUSHDATA
   * OP_PUSHDATA2 use OP_PUSHDATA
   * OP_PUSHDATA4 use OP_PUSHDATA
   */
  OP_PUSHDATA: (buffer: Buffer, endian: 'little' | 'big'): OP_PUSHDATA => {
    return new OP_PUSHDATA(buffer, endian)
  },
  /**
   * @param {string} hex in little endian
   */
  OP_PUSHDATA_HEX_LE: (hex: string): OP_PUSHDATA => {
    return new OP_PUSHDATA(Buffer.from(hex, 'hex'), 'little')
  },
  // TODO: to map everything as class
  //  to be separated into concerns, stack, arithmetic, crypto, etc...

  OP_1NEGATE: new constants.OP_1NEGATE(),
  //  OP_RESERVED = 0x50,
  OP_1: new constants.OP_1(),
  OP_TRUE: new constants.OP_TRUE(),
  OP_2: new constants.OP_2(),
  OP_3: new constants.OP_3(),
  OP_4: new constants.OP_4(),
  OP_5: new constants.OP_5(),
  OP_6: new constants.OP_6(),
  OP_7: new constants.OP_7(),
  OP_8: new constants.OP_8(),
  OP_9: new constants.OP_9(),
  OP_10: new constants.OP_10(),
  OP_11: new constants.OP_11(),
  OP_12: new constants.OP_12(),
  OP_13: new constants.OP_13(),
  OP_14: new constants.OP_14(),
  OP_15: new constants.OP_15(),
  OP_16: new constants.OP_16(),

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
  0x4f: OP_CODES.OP_1NEGATE,
  0x51: OP_CODES.OP_1,
  0x52: OP_CODES.OP_2,
  0x53: OP_CODES.OP_3,
  0x54: OP_CODES.OP_4,
  0x55: OP_CODES.OP_5,
  0x56: OP_CODES.OP_6,
  0x57: OP_CODES.OP_7,
  0x58: OP_CODES.OP_8,
  0x59: OP_CODES.OP_9,
  0x5a: OP_CODES.OP_10,
  0x5b: OP_CODES.OP_11,
  0x5c: OP_CODES.OP_12,
  0x5d: OP_CODES.OP_13,
  0x5e: OP_CODES.OP_14,
  0x5f: OP_CODES.OP_15,
  0x60: OP_CODES.OP_16,
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
