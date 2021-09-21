import { bech32 } from 'bech32'
import { Network } from '@defichain/jellyfish-network'

/**
 * Human Readable Part, prefixed to all bech32/segwit native address
 *
 * df   - DeFi MainNet
 * tf   - DeFi TestNet
 * bcrt - DeFi RegTest
 */
export type HRP = Network['bech32']['hrp']

/**
 * @param {Buffer} buffer to format into bech32, len 20 = p2wpkh, len 32 = p2wsh
 * @param {Network['bech32']['hrp']} hrp is the human readable part to prefix
 * @param {number} [version] witness version, OP_0
 * @return {string} bech32 encoded address
 * @see https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki
 */
export function toBech32 (buffer: Buffer, hrp: HRP, version: 0x00): string {
  if (buffer.length !== 20 && buffer.length !== 32) {
    throw new TypeError('Bech32 buffer length must be either 20 or 32')
  }

  const words = bech32.toWords(buffer)
  words.unshift(version)
  return bech32.encode(hrp, words)
}
