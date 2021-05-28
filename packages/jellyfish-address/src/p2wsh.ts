import { bech32 } from 'bech32'
import { getNetwork, MainNet, Network, NetworkName, RegTest, TestNet } from '@defichain/jellyfish-network'
import { Script, OP_CODES, OP_PUSHDATA } from '@defichain/jellyfish-transaction'
import { Address } from './address'

export class P2WSH extends Address {
  static SCRIPT_HASH_LENGTH = 32 // count in bytes

  constructor (network: Network | undefined, utf8String: string, scriptHash: Buffer | undefined, valid: boolean = false) {
    super(network, utf8String, scriptHash, valid, 'P2WSH')

    if (valid && scriptHash?.length !== P2WSH.SCRIPT_HASH_LENGTH) {
      throw new Error('InvalidDefiAddress')
    }
  }

  getScript (): Script {
    return {
      stack: [
        OP_CODES.OP_0,
        new OP_PUSHDATA(this.getBuffer(), 'little')
      ]
    }
  }

  /**
   * @param {NetworkName|Network} net mainnet | testnet | regtest
   * @param {Buffer|string} data data, script hash (32 bytes, 64 characters)
   * @throws when data input string is not 64 characters long (32 bytes)
   * @returns {P2WSH}
   */
  static to (net: Network | NetworkName, data: string | Buffer, witnessVersion = 0x00): P2WSH {
    const network: Network = typeof net === 'string' ? getNetwork(net) : net
    const numbers = typeof data === 'string' ? Buffer.from(data, 'hex') : data

    if (numbers.length !== P2WSH.SCRIPT_HASH_LENGTH) {
      throw new Error('InvalidScriptHashLength')
    }

    const fiveBitsWords = bech32.toWords(numbers)
    const includeVersion = [witnessVersion, ...fiveBitsWords]
    const utf8 = bech32.encode(network.bech32.hrp, includeVersion)
    return new P2WSH(network, utf8, numbers, true)
  }

  /**
   * @param {string} raw jellyfish p2wpkh (bech32 address) string
   * @returns {P2WSH}
   */
  static from (raw: string): P2WSH {
    let valid: boolean
    let prefix: string
    let data: Buffer | undefined
    let network: Network | undefined
    try {
      const decoded = bech32.decode(raw)
      valid = true
      prefix = decoded.prefix
      const trimmedVersion = decoded.words.slice(1)
      data = Buffer.from(bech32.fromWords(trimmedVersion))

      network = [MainNet, TestNet, RegTest].find(net => net.bech32.hrp === prefix)
      valid = data.length === P2WSH.SCRIPT_HASH_LENGTH && network !== undefined
    } catch (e) {
      valid = false
    }

    return new P2WSH(network, raw, data, valid)
  }
}
