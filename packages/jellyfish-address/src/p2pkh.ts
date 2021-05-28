import { Bs58 } from '@defichain/jellyfish-crypto'
import { getNetwork, MainNet, Network, NetworkName, RegTest, TestNet } from '@defichain/jellyfish-network'
import { Script, OP_CODES, OP_PUSHDATA } from '@defichain/jellyfish-transaction'
import { Address } from './address'

export class P2PKH extends Address {
  constructor (network: Network | undefined, utf8String: string, pubKeyHash: Buffer | undefined, valid: boolean) {
    super(network, utf8String, pubKeyHash, valid, 'P2PKH')

    // safety precaution
    if (valid && (
      network === undefined ||
      utf8String.length < 26 ||
      utf8String.length > 35 ||
      pubKeyHash?.length !== 20
    )) {
      throw new Error('Invalid P2PKH address marked valid')
    }
  }

  getScript (): Script {
    if (!this.valid) {
      throw new Error('InvalidDefiAddress')
    }

    return {
      stack: [
        OP_CODES.OP_DUP,
        OP_CODES.OP_HASH160,
        new OP_PUSHDATA(this.buffer as Buffer, 'little'),
        OP_CODES.OP_EQUALVERIFY,
        OP_CODES.OP_CHECKSIG
      ]
    }
  }

  /**
   * @param {NetworkName|Network} net mainnet | testnet | regtest
   * @param {Buffer|string} h160 data, public key hash (20 bytes, 40 characters)
   * @param {number} witnessVersion default 0, not more than 1 byte
   * @throws when h160 input string is not 40 characters long (20 bytes)
   * @returns {P2WSH}
   */
  static to (net: NetworkName | Network, h160: string | Buffer): P2PKH {
    const network = typeof net === 'string' ? getNetwork(net) : net
    const address = Bs58.fromHash160(h160, network.pubKeyHashPrefix)
    const buffer = typeof h160 === 'string' ? Buffer.from(h160, 'hex') : h160
    return new P2PKH(network, address, buffer, true)
  }

  /**
   * @param {string} utf8String jellyfish p2pkh (base58 address) string, 26-35 characters
   * @returns {P2PKH}
   */
  static from (utf8String: string): P2PKH {
    let network: Network | undefined
    let buffer: Buffer | undefined
    let valid = false
    try {
      const decoded = Bs58.toHash160(utf8String)
      buffer = decoded.buffer
      network = [MainNet, TestNet, RegTest].find(net => net.pubKeyHashPrefix === decoded.prefix)
      valid = network !== undefined
    } catch {
      // non b58 string, invalid address
    }
    return new P2PKH(network, utf8String, buffer, valid)
  }
}
