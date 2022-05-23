import { SHA256 } from '@defichain/jellyfish-crypto'

/**
 * HexEncoder to encode various DeFi transaction data into fixed length hex
 * This allow the use of fixed length sorting in LSM database.
 */
export const HexEncoder = {
  /**
   * @param {string} hex to encode into HID 32 bytes hex-encoded string
   * @return {string} fixed length of 32 byte
   */
  asSHA256 (hex: string): string {
    const buffer = Buffer.from(hex, 'hex')
    return SHA256(buffer).toString('hex')
  },

  /**
   * 4 byte hex, Max Number = 4294967295
   * @param {number} height from block to hex, about 4000 years
   * @return {string} fixed length of 4 byte
   */
  encodeHeight (height: number): string {
    if (height > 4294967295) {
      throw new Error('max 32 bits but number larger than 4294967295')
    }
    return height.toString(16).padStart(8, '0')
  },
  /**
   * 4 byte hex, Max Number = 4294967295
   * @param {number} n from vout to hex, 4 bytes max consensus rule
   * @return {string} fixed length of 4 byte
   */
  encodeVoutIndex (n: number): string {
    if (n > 4294967295) {
      throw new Error('max 32 bits but number larger than 4294967295')
    }
    return n.toString(16).padStart(8, '0')
  }
}
