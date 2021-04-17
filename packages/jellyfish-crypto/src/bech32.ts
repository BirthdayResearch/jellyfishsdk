import { bech32 } from 'bech32'
import { SHA256 } from './hash'

/**
 * Human Readable Part, prefixed to all bech32/segwit native address
 *
 * df   - DeFi MainNet
 * tf   - DeFi TestNet
 * bcrt - DeFi RegTest
 */
export type HRP = 'df' | 'tf' | 'bcrt'

/**
 * @param {Buffer} pubKey to format into bech32
 * @param {'df'|'tf'|'bcrt'} hrp is the human readable part
 * @param {number} version witness version, OP_0
 * @return {string} bech32 encoded address
 * @see https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki
 */
export function toBech32 (pubKey: Buffer, hrp: HRP, version: 0x00 = 0x00): string {
  const hash = SHA256(pubKey)
  const words = bech32.toWords(hash)
  words.unshift(version)
  return bech32.encode(hrp, words)
}

/**
 * @param {string} address to decode from bech32
 * @param {'df'|'tf'|'bcrt'} hrp is the human readable part
 * @param {number} version witness version, OP_0
 * @return {Buffer} hash160 of the pubkey
 * @see https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki
 */
export function fromBech32 (address: string, hrp?: HRP, version?: 0x00): Buffer {
  const { prefix, words } = bech32.decode(address)
  if (hrp !== undefined && prefix !== hrp) {
    throw new Error('Invalid HRP: human readable part')
  }

  const witnessVersion = words.splice(0, 1)[0]
  if (version !== undefined && version !== witnessVersion) {
    throw new Error('Invalid witness version')
  }

  return Buffer.from(bech32.fromWords(words))
}
