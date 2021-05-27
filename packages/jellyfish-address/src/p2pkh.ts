import { Bs58 } from '@defichain/jellyfish-crypto/src'
import { getNetwork, MainNet, Network, NetworkName, RegTest, TestNet } from '@defichain/jellyfish-network'
import { Script, OP_CODES, OP_PUSHDATA } from '@defichain/jellyfish-transaction'
import { Address } from './address'

export class P2PKH extends Address {
  readonly pubKeyHash: Buffer | undefined // H160(33 bytes pubKey)

  constructor (network: Network | undefined, utf8String: string, pubKeyHash: Buffer | undefined, valid: boolean) {
    super(network, utf8String, valid, 'P2PKH')
    this.pubKeyHash = pubKeyHash

    // safety precaution
    if (valid && (utf8String.length < 26 || utf8String.length > 35 || pubKeyHash?.length !== 20)) {
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
        new OP_PUSHDATA(this.pubKeyHash as Buffer, 'little'),
        OP_CODES.OP_EQUALVERIFY,
        OP_CODES.OP_CHECKSIG
      ]
    }
  }

  static to (net: NetworkName | Network, h160: string | Buffer): P2PKH {
    const network = typeof net === 'string' ? getNetwork(net) : net
    const address = Bs58.fromHash160(h160, network.pubKeyHashPrefix)
    const buffer = typeof h160 === 'string' ? Buffer.from(h160, 'hex') : h160
    return new P2PKH(network, address, buffer, true)
  }

  static from (utf8String: string): P2PKH {
    let network: Network | undefined
    let buffer: Buffer | undefined
    let valid = false
    try {
      const decoded = Bs58.toHash160(utf8String)
      buffer = decoded.buffer
      network = [MainNet, TestNet, RegTest].find(net => net.pubKeyHashPrefix === decoded.prefix)
      valid = true
    } catch {
      // non b58 string, invalid address
    }
    return new P2PKH(network, utf8String, buffer, valid)
  }
}
