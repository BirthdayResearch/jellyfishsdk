import { SmartBuffer } from 'smart-buffer'
import { OPCode } from '../opcode'
import { OP_PUSHDATA } from '../data'
import { OP_RETURN } from '../control'
import { CDfTx, DfTx } from './dftx'
import { OP_CODES } from '../mapping'

export * from './dftx_account'
export * from './dftx_balance'
export * from './dftx_governance'
export * from './dftx_masternode'
export * from './dftx_misc'
export * from './dftx_oracles'
export * from './dftx_pool'
export * from './dftx_price'
export * from './dftx_token'
export * from './dftx_loans'
export * from './dftx_vault'
export * from './dftx_unmapped'
export * from './dftx_icxorderbook'
export * from './dftx_evmtx'
export * from './dftx'

const DEFI_SIGNATURE = '44665478' // DfTx

/**
 * @param {OPCode[]} stack to check if it is a dftx script
 */
export function isDeFiScript (stack: OPCode[]): boolean {
  if (stack.length < 2) {
    return false
  }

  if (!(stack[0] instanceof OP_RETURN && stack[1] instanceof OP_PUSHDATA)) {
    return false
  }

  const pushData = stack[1] as OP_PUSHDATA
  const hex = pushData.hex
  return hex.length >= 10 && hex.startsWith(DEFI_SIGNATURE)
}

/**
 * @param {OPCode[]} stack to check and remap into OP_DEFI_TX if valid
 */
export function remapDeFiScript (stack: OPCode[]): OPCode[] {
  if (!isDeFiScript(stack)) {
    return stack
  }

  const pushData = stack[1] as OP_PUSHDATA
  const hex = pushData.hex

  const buffer = SmartBuffer.fromBuffer(
    Buffer.from(hex, 'hex')
  )
  const dftx = new CDfTx(buffer)

  return [
    OP_CODES.OP_RETURN,
    OP_CODES.OP_DEFI_TX(dftx.toObject()),
    ...stack.slice(2)
  ]
}

/**
 * DeFi Transaction wrapped as an OpCode
 */
export class OP_DEFI_TX extends OPCode {
  public readonly tx: DfTx<any>

  constructor (tx: DfTx<any>) {
    super('OP_DEFI_TX')
    this.tx = tx
  }

  asBuffer (): Buffer {
    const buffer = new SmartBuffer()
    new CDfTx(this.tx).toBuffer(buffer)

    return Buffer.concat([
      OP_PUSHDATA.getLenOpBuffer(buffer.length),
      buffer.toBuffer()
    ])
  }
}
