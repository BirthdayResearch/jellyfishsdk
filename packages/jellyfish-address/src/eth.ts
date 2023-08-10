import { OP_CODES, Script } from '@defichain/jellyfish-transaction'

function validateAddress (address: string): boolean {
  // https://github.com/ethers-io/ethers.js/blob/5210b68a7837654c6b84207a45e1e573d9472d1a/src.ts/address/address.ts#L123
  const regex: RegExp = /^0x[a-fA-F0-9]{40}$/gm
  return regex.test(address)
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
        OP_CODES.OP_PUSHDATA_HEX_LE(address.substring(2))
      ]
    }
  }
}
