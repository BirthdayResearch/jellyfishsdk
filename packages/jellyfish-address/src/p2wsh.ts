import { bech32 } from 'bech32'
import { getNetwork, Network, NetworkName } from '@defichain/jellyfish-network'
import { Script, OP_CODES, OP_PUSHDATA } from '@defichain/jellyfish-transaction'
import { Address } from './address'

export class P2WSH extends Address {
  // 32 bytes, data only, 64 char
  data: string
  static SCRIPT_HASH_LENGTH = 64

  constructor (network: Network, utf8String: string, data: string, valid: boolean = false) {
    super(network, utf8String, valid, 'P2WSH')
    this.data = data
  }

  getScript (): Script {
    if (!this.valid) {
      throw new Error('InvalidDefiAddress')
    }

    return {
      stack: [
        OP_CODES.OP_0,
        new OP_PUSHDATA(Buffer.from(this.data, 'hex'), 'little')
      ]
    }
  }

  /**
   * @param net network
   * @param hex data, redeem script (32 bytes, 64 characters)
   * @param witnessVersion default 0
   * @returns
   */
  static to (net: Network | NetworkName, hex: string, witnessVersion = 0x00): P2WSH {
    const network: Network = typeof net === 'string' ? getNetwork(net) : net

    if (hex.length !== P2WSH.SCRIPT_HASH_LENGTH) {
      throw new Error('InvalidScriptHashLength')
    }

    const numbers = Buffer.from(hex, 'hex')
    const fiveBitsWords = bech32.toWords(numbers)
    const includeVersion = [witnessVersion, ...fiveBitsWords]
    const utf8 = bech32.encode(network.bech32.hrp, includeVersion)
    return new P2WSH(network, utf8, hex, true)
  }

  /**
   * @param {string} raw jellyfish p2wpkh (bech32 address) string
   * @throws when decoded prefix is not found in DeFiChain ecosystem (mainnet / testnet / regtest)
   * @returns {P2WSH}
   */
  static from (raw: string): P2WSH {
    let valid: boolean
    let prefix: string
    let data: string = ''
    try {
      const decoded = bech32.decode(raw)
      valid = true
      prefix = decoded.prefix
      const trimmedVersion = decoded.words.slice(1)
      data = Buffer.from(bech32.fromWords(trimmedVersion)).toString('hex')

      if (data.length !== P2WSH.SCRIPT_HASH_LENGTH) {
        valid = false
      }
    } catch (e) {
      valid = false
    }

    const network = (['mainnet', 'testnet', 'regtest'] as NetworkName[])
      .map(netName => getNetwork(netName))
      .find(net => net.bech32.hrp === prefix)

    if (network === undefined) {
      throw new Error('Unexpected network prefix')
    }

    return new P2WSH(network, raw, data, valid)
  }
}
