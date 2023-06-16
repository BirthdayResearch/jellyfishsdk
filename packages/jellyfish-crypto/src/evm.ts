import { KECCAK256 } from './hash'

export const Evm = {
  /**
   * @param {Buffer} pubKey to format into Eth
   * @return {string} eth encoded address
   */
  fromPubKey (pubKey: Buffer): string {
    if (pubKey.length !== 33) {
      throw new Error('InvalidPubKeyLength')
    }
    return `0x${KECCAK256(pubKey)}`
  }
}
