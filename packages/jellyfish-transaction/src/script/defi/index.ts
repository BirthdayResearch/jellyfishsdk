import { SmartBuffer } from 'smart-buffer'
import { OPCode } from '../opcode'
import { OP_PUSHDATA } from '../data'
import { OP_RETURN } from '../control'
import { CDfTx, DfTx } from './dftx'
import { OP_CODES } from '../mapping'

const DEFI_SIGNATURE = '44665478' // DfTx

/**
 * @param {OPCode[]} stack to check if it is a defi script
 */
export function isDeFiScript (stack: OPCode[]): boolean {
  if (stack.length !== 2) {
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
    OP_CODES.OP_DEFI_TX(dftx.toObject())
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
