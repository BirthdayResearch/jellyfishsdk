import { SmartBuffer } from 'smart-buffer'
import { readVarUInt, writeVarUInt } from '../buffer/buffer_varuint'
import { toBuffer, toOPCodes } from './_buffer'
import { OPCode, StaticCode } from './opcode'
import { OP_PUSHDATA } from './data'
import { OP_DEFI_TX } from './defi'
import { CDfTx, DfTx } from './defi/dftx'
import * as constants from './constants'
import * as crypto from './crypto'
import * as control from './control'
import * as stack from './stack'
import * as bitwise from './bitwise'
import {
  CPoolAddLiquidity,
  CPoolRemoveLiquidity,
  CPoolSwap,
  PoolAddLiquidity,
  PoolRemoveLiquidity,
  PoolSwap
} from './defi/dftx_pool'
import { CTokenCreate, CTokenMint, TokenCreate, TokenMint } from './defi/dftx_token'
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
import {
  CAppointOracle,
  AppointOracle,
  RemoveOracle,
  CRemoveOracle,
  UpdateOracle,
  CUpdateOracle,
  SetOracleData,
  CSetOracleData
} from './defi/dftx_oracles'
import { CAutoAuthPrep } from './defi/dftx_misc'

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
  /**
   * Read SmartBuffer and create OPCode[] stack.
   *
   * Using P2WPKH redeem script as an example.
   *
   * Input Example: 1600140e7c0ab18b305bc987a266dc06de26fcfab4b56a
   *   0x16 (VarUInt)
   *   0x00 (OP_0)
   *   6ab5b4fafc26de06dc66a287c95b308bb10a7c0e (formatted as big endian)
   *
   * Output Example:
   *   OP_0
   *   OP_PUSHDATA<RIPEMD160(SHA256(pubkey))>
   *
   * @param {SmartBuffer} buffer to read from
   * @return {OPCode[]} read from buffer to OPCode
   */
  fromBuffer (buffer: SmartBuffer) {
    const length = readVarUInt(buffer)
    if (length === 0) {
      return []
    }

    return toOPCodes(SmartBuffer.fromBuffer(buffer.readBuffer(length)))
  },
  /**
   * Converts OPCode[] and write it into SmartBuffer.
   *
   * Using P2PKH redeem script as an example.
   *
   * Input Example:
   *   OP_DUP
   *   OP_HASH160
   *   OP_PUSHDATA<RIPEMD160(SHA256(pubkey))>
   *   OP_EQUALVERIFY
   *   OP_CHECKSIG
   *
   * Output Example: 1976a9143bde42dbee7e4dbe6a21b2d50ce2f0167faa815988ac
   *   0x19 (VarUInt)
   *   0x76 (OP_DUP)
   *   0xa9 (OP_HASH160)
   *   5981aa7f16f0e20cd5b2216abe4d7eeedb42de3b (formatted as big endian)
   *   0x88 (OP_EQUALVERIFY)
   *   0xac (OP_CHECKSIG)
   *
   * @param {OPCode[]} stack to convert into raw buffer
   * @param {SmartBuffer} buffer to write to
   */
  toBuffer (stack: OPCode[], buffer: SmartBuffer) {
    const buffs = toBuffer(stack)

    // Write the len of buffer in bytes and then all the buffer
    writeVarUInt(buffs.length, buffer)
    buffer.writeBuffer(buffs)
  },
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
  OP_DEFI_TX_TOKEN_CREATE: (tokenCreate: TokenCreate): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CTokenCreate.OP_CODE,
      name: CTokenCreate.OP_NAME,
      data: tokenCreate
    })
  },
  OP_DEFI_TX_UTXOS_TO_ACCOUNT: (utxosToAccount: UtxosToAccount): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CUtxosToAccount.OP_CODE,
      name: CUtxosToAccount.OP_NAME,
      data: utxosToAccount
    })
  },
  OP_DEFI_TX_ACCOUNT_TO_UTXOS: (accountToUtxos: AccountToUtxos): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CAccountToUtxos.OP_CODE,
      name: CAccountToUtxos.OP_NAME,
      data: accountToUtxos
    })
  },
  OP_DEFI_TX_ACCOUNT_TO_ACCOUNT: (accountToAccount: AccountToAccount): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CAccountToAccount.OP_CODE,
      name: CAccountToAccount.OP_NAME,
      data: accountToAccount
    })
  },
  OP_DEFI_TX_ANY_ACCOUNT_TO_ACCOUNT: (anyAccountToAccount: AnyAccountToAccount): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CAnyAccountToAccount.OP_CODE,
      name: CAnyAccountToAccount.OP_NAME,
      data: anyAccountToAccount
    })
  },
  OP_DEFI_TX_APPOINT_ORACLE: (appointOracle: AppointOracle): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CAppointOracle.OP_CODE,
      name: CAppointOracle.OP_NAME,
      data: appointOracle
    })
  },
  OP_DEFI_TX_REMOVE_ORACLE: (removeOracle: RemoveOracle): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CRemoveOracle.OP_CODE,
      name: CRemoveOracle.OP_NAME,
      data: removeOracle
    })
  },
  OP_DEFI_TX_UPDATE_ORACLE: (updateOracle: UpdateOracle): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CUpdateOracle.OP_CODE,
      name: CUpdateOracle.OP_NAME,
      data: updateOracle
    })
  },
  OP_DEFI_TX_SET_ORACLE_DATA: (setOracleData: SetOracleData): OP_DEFI_TX => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CSetOracleData.OP_CODE,
      name: CSetOracleData.OP_NAME,
      data: setOracleData
    })
  },
  OP_DEFI_TX_AUTO_AUTH_PREP: () => {
    return new OP_DEFI_TX({
      signature: CDfTx.SIGNATURE,
      type: CAutoAuthPrep.OP_CODE,
      name: CAutoAuthPrep.OP_NAME,
      data: null
    })
  },

  OP_0: new constants.OP_0(),
  OP_FALSE: new constants.OP_FALSE(),
  /**
   * OP_PUSHDATA1 use OP_PUSHDATA
   * OP_PUSHDATA2 use OP_PUSHDATA
   * OP_PUSHDATA4 use OP_PUSHDATA
   * @param {Buffer} buffer
   * @param {'little' | 'big'} endian order
   */
  OP_PUSHDATA: (buffer: Buffer, endian: 'little' | 'big'): OP_PUSHDATA => {
    return new OP_PUSHDATA(buffer, endian)
  },
  /**
   * @param {Buffer} buffer in little endian
   */
  OP_PUSHDATA_LE: (buffer: Buffer): OP_PUSHDATA => {
    return new OP_PUSHDATA(buffer, 'little')
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
  OP_RESERVED: new constants.OP_RESERVED(),
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
  OP_RETURN: new control.OP_RETURN(),

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
  OP_DUP: new stack.OP_DUP(),
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
  OP_EQUAL: new bitwise.OP_EQUAL(),
  OP_EQUALVERIFY: new bitwise.OP_EQUALVERIFY(),
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
  OP_RIPEMD160: new crypto.OP_RIPEMD160(),
  OP_SHA1: new crypto.OP_SHA1(),
  OP_SHA256: new crypto.OP_SHA256(),
  OP_HASH160: new crypto.OP_HASH160(),
  OP_HASH256: new crypto.OP_HASH256(),
  OP_CODESEPARATOR: new crypto.OP_CODESEPARATOR(),
  OP_CHECKSIG: new crypto.OP_CHECKSIG(),
  OP_CHECKSIGVERIFY: new crypto.OP_CHECKSIGVERIFY(),
  OP_CHECKMULTISIG: new crypto.OP_CHECKMULTISIG(),
  OP_CHECKMULTISIGVERIFY: new crypto.OP_CHECKMULTISIGVERIFY()

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
  0x50: OP_CODES.OP_RESERVED,
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
  0xa6: OP_CODES.OP_RIPEMD160,
  0xa7: OP_CODES.OP_SHA1,
  0xa8: OP_CODES.OP_SHA256,
  0xa9: OP_CODES.OP_HASH160,
  0xaa: OP_CODES.OP_HASH256,
  0xab: OP_CODES.OP_CODESEPARATOR,
  0xac: OP_CODES.OP_CHECKSIG,
  0xad: OP_CODES.OP_CHECKSIGVERIFY,
  0xae: OP_CODES.OP_CHECKMULTISIG,
  0xaf: OP_CODES.OP_CHECKMULTISIGVERIFY
}
