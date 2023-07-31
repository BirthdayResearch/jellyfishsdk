import createKeccakHash from 'keccak'
import { KECCAK256 } from './hash'
import { OP_CODES, Script } from '@defichain/jellyfish-transaction'

// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-55.md
function toChecksumAddress (address: string): string {
  address = address.toLowerCase().replace('0x', '')
  const hash = createKeccakHash('keccak256').update(address).digest('hex')
  let checksum = '0x'

  for (let i = 0; i < address.length; i += 1) {
    parseInt(hash[i], 16) >= 8
      ? checksum += address[i].toUpperCase()
      : checksum += address[i]
  }

  return checksum
}

function toAddress (hash: Buffer): string {
  const hex = hash.toString('hex')
  // grab the last 20 bytes (40 chars)
  const sliced = hex.slice(hex.length - 40)
  return `0x${sliced}`
}

function validateAddress (address: string): boolean {
  // https://github.com/ethers-io/ethers.js/blob/5210b68a7837654c6b84207a45e1e573d9472d1a/src.ts/address/address.ts#L123
  const regex: RegExp = /^0x[a-fA-F0-9]{40}$/gm
  return regex.test(address)
}

export const Eth = {
  /**
   * @param {Buffer} uncompressed pubKey to format into Eth
   * @return {string} eth encoded address
   */
  fromPubKeyUncompressed (pubKeyUncompressed: Buffer): string {
    if (pubKeyUncompressed.length !== 65) {
      throw new Error('InvalidUncompressedPubKeyLength')
    }
    const sub = pubKeyUncompressed.subarray(1, 65)
    const hash = KECCAK256(sub)
    return toChecksumAddress(toAddress(hash))
  },
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
