import { Bs58 } from '@defichain/jellyfish-crypto'
import { getNetwork, MainNet, Network, NetworkName, RegTest, TestNet } from '@defichain/jellyfish-network'
import { Script, OP_CODES, OP_PUSHDATA } from '@defichain/jellyfish-transaction'
import { Address } from './address'

export class P2SH extends Address {
  constructor (network: Network | undefined, utf8String: string, scriptHash: Buffer | undefined, valid: boolean = false) {
    super(network, utf8String, scriptHash, valid, 'P2SH')

    // safety precaution
    if (valid && (
      network === undefined ||
      utf8String.length < 26 ||
      utf8String.length > 35 ||
      scriptHash?.length !== 20
    )) {
      throw new Error('Invalid P2SH address marked valid')
    }
  }

  getScript (): Script {
    if (!this.valid) {
      throw new Error('InvalidDefiAddress')
    }

    return {
      stack: [
        OP_CODES.OP_HASH160,
        new OP_PUSHDATA(this.buffer as Buffer, 'little'),
        OP_CODES.OP_EQUAL
      ]
    }
  }

  /**
   * @param {NetworkName|Network} net mainnet | testnet | regtest
   * @param {Buffer|string} h160 data, script hash (32 bytes, 64 characters)
   * @throws when h160 input string is not 64 characters long (32 bytes)
   * @returns {P2SH}
   */
  static to (net: NetworkName | Network, h160: string | Buffer): P2SH {
    const network = typeof net === 'string' ? getNetwork(net) : net
    const address = Bs58.fromHash160(h160, network.scriptHashPrefix)
    const buffer = typeof h160 === 'string' ? Buffer.from(h160, 'hex') : h160
    return new P2SH(network, address, buffer, true)
  }

  /**
   * @param {string} raw jellyfish p2sh (base58 address) string, 26-35 characters
   * @returns {P2SH}
   */
  static from (utf8String: string): P2SH {
    let network: Network | undefined
    let buffer: Buffer | undefined
    let valid = false
    try {
      const decoded = Bs58.toHash160(utf8String)
      buffer = decoded.buffer
      network = [MainNet, TestNet, RegTest].find(net => net.scriptHashPrefix === decoded.prefix)
      valid = network !== undefined
    } catch {
      // non b58 string, invalid address
    }
    return new P2SH(network, utf8String, buffer, valid)
  }
}
