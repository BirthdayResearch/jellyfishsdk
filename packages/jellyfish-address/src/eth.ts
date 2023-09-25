import { OP_CODES, OP_PUSHDATA, Script } from '@defichain/jellyfish-transaction'

function validateAddress (address: string): boolean {
  // https://github.com/ethers-io/ethers.js/blob/5210b68a7837654c6b84207a45e1e573d9472d1a/src.ts/address/address.ts#L123
  const regex: RegExp = /^0x[a-fA-F0-9]{40}$/gm
  return regex.test(address)
}

function validateScript (script: Script): boolean {
  return script.stack.length === 2 &&
    script.stack[0].type === OP_CODES.OP_16.type &&
    script.stack[1].type === 'OP_PUSHDATA' && (script.stack[1] as OP_PUSHDATA).length() === 20
}

export const Eth = {
  /**
   * @param {string} address to convert into Script
   * @return {Script} Script parsed from address
   */
  fromAddress (address: string): Script | undefined {
    if (!validateAddress(address)) {
      return undefined
    }
    return {
      stack: [
        OP_CODES.OP_16,
        OP_CODES.OP_PUSHDATA_HEX_BE(address.substring(2))
      ]
    }
  },

  /**
   * EVM Script is LE in DVM, revert back to BE as what Ethereum behave
   *
   * @param {Script} script to convert into address
   * @returns {string} address parsed from script
   */
  fromScript (script: Script): string | undefined {
    if (!validateScript(script)) {
      return undefined
    }
    const { hex } = (script.stack[1] as OP_PUSHDATA)
    return Buffer.from(hex, 'hex').reverse().toString('hex')
  }
}
