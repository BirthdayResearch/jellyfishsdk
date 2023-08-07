import createKeccakHash from 'keccak'
import { KECCAK256 } from './hash'

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
    const hash = KECCAK256(Buffer.from(sub))
    return toChecksumAddress(toAddress(hash))
  }
}
