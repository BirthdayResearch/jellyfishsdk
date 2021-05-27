import { bech32 } from 'bech32'
import { getNetwork, Network, NetworkName } from '@defichain/jellyfish-network'
import { Script, OP_CODES, OP_PUSHDATA } from '@defichain/jellyfish-transaction'
import { Address } from './address'

export class P2WPKH extends Address {
  // 20 bytes, data only, 40 char
  pubKeyHash: string
  static PUB_KEY_HASH_LENGTH = 40

  constructor (network: Network | undefined, utf8String: string, pubKeyHash: string, validated: boolean = false) {
    super(network, utf8String, validated, 'P2WPKH')
    this.pubKeyHash = pubKeyHash
  }

  getScript (): Script {
    if (!this.valid) {
      throw new Error('InvalidDefiAddress')
    }

    return {
      stack: [
        OP_CODES.OP_0,
        new OP_PUSHDATA(Buffer.from(this.pubKeyHash, 'hex'), 'little')
      ]
    }
  }

  /**
   * @param net network
   * @param hex data, public key hash (20 bytes, 40 characters)
   * @param witnessVersion default 0
   * @throws when h160 input string is not 40 characters long (20 bytes)
   * @returns
   */
  static to (net: Network | NetworkName, h160: string, witnessVersion = 0x00): P2WPKH | never {
    const network: Network = typeof net === 'string' ? getNetwork(net) : net

    if (h160.length !== P2WPKH.PUB_KEY_HASH_LENGTH) {
      throw new Error('InvalidPubKeyHashLength')
    }

    const numbers = Buffer.from(h160, 'hex')
    const fiveBitsWords = bech32.toWords(numbers)
    const includeVersion = [witnessVersion, ...fiveBitsWords]
    const utf8 = bech32.encode(network.bech32.hrp, includeVersion)
    return new P2WPKH(network, utf8, h160, true)
  }

  /**
   * @param {string} raw jellyfish p2wpkh (bech32 address) string
   * @throws when decoded prefix is not found in DeFiChain ecosystem (mainnet / testnet / regtest)
   * @returns {P2WPKH}
   */
  static from (raw: string): P2WPKH {
    let valid: boolean
    let prefix: string
    let data: string = ''
    try {
      const decoded = bech32.decode(raw)
      valid = true
      prefix = decoded.prefix
      const trimmedVersion = decoded.words.slice(1)
      data = Buffer.from(bech32.fromWords(trimmedVersion)).toString('hex')

      if (data.length !== P2WPKH.PUB_KEY_HASH_LENGTH) {
        valid = false
      }
    } catch (e) {
      valid = false
    }

    const network = (['mainnet', 'testnet', 'regtest'] as NetworkName[])
      .map(netName => getNetwork(netName))
      .find(net => net.bech32.hrp === prefix)

    return new P2WPKH(network, raw, data, valid)
  }
}
