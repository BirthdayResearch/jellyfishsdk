import { bech32 } from 'bech32'
import { getNetwork, MainNet, Network, NetworkName, RegTest, TestNet } from '@defichain/jellyfish-network'
import { Script, OP_CODES, OP_PUSHDATA } from '@defichain/jellyfish-transaction'
import { Address } from './address'

export class P2WPKH extends Address {
  static PUB_KEY_HASH_LENGTH = 20 // count in bytes

  constructor (network: Network | undefined, utf8String: string, pubKeyHash: Buffer | undefined, valid: boolean = false) {
    super(network, utf8String, pubKeyHash, valid, 'P2WPKH')

    // safety precaution
    if (valid && pubKeyHash?.length !== P2WPKH.PUB_KEY_HASH_LENGTH) {
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
   * @param {Buffer|string} h160 data, public key hash (20 bytes, 40 characters)
   * @throws when h160 input string is not 40 characters long (20 bytes)
   * @returns {P2WPKH}
   */
  static to (net: Network | NetworkName, h160: string | Buffer, witnessVersion = 0x00): P2WPKH {
    const network: Network = typeof net === 'string' ? getNetwork(net) : net
    const numbers = typeof h160 === 'string' ? Buffer.from(h160, 'hex') : h160

    if (numbers.length !== P2WPKH.PUB_KEY_HASH_LENGTH) {
      throw new Error('InvalidPubKeyHashLength')
    }

    const fiveBitsWords = bech32.toWords(numbers)
    const includeVersion = [witnessVersion, ...fiveBitsWords]
    const utf8 = bech32.encode(network.bech32.hrp, includeVersion)
    return new P2WPKH(network, utf8, numbers, true)
  }

  /**
   * @param {string} raw jellyfish p2wpkh (bech32 address) string
   * @returns {P2WPKH}
   */
  static from (raw: string): P2WPKH {
    let network: Network | undefined
    let data: Buffer | undefined
    let valid: boolean = false
    try {
      const decoded = bech32.decode(raw)
      const trimmedVersion = decoded.words.slice(1)
      data = Buffer.from(bech32.fromWords(trimmedVersion))

      network = [MainNet, TestNet, RegTest].find(net => net.bech32.hrp === decoded.prefix)
      valid = data.length === P2WPKH.PUB_KEY_HASH_LENGTH && network !== undefined
    } catch (e) {
      // invalid address, fail to decode bech32
    }

    return new P2WPKH(network, raw, data, valid)
  }
}
