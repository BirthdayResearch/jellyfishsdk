import { OPCode } from "../opcode";
import { OP_PUSHDATA } from "../data";
import { OP_RETURN } from "../control";

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

export function remapDeFiScript (stack: OPCode[]): OPCode[] {
  if (!isDeFiScript(stack)) {
    return stack
  }

  // TODO(fuxingloh): OP_RETURN and 44665478
  return stack
}
