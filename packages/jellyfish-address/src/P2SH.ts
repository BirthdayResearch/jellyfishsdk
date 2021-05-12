import { Network } from '@defichain/jellyfish-network'
import { Script } from '@defichain/jellyfish-transaction'
import { OP_CODES, OP_PUSHDATA } from '@defichain/jellyfish-transaction/src/script'
import { Base58Address } from './Base58Address'

export class P2SH extends Base58Address {
  static SCRIPT_HASH_LENGTH = 50 // 25 bytes, 50 char

  constructor (network: Network, utf8String: string, hex: string, validated: boolean = false) {
    super(network, utf8String, hex, validated, 'P2SH')
  }

  getPrefix (): number {
    return this.network.scriptHashPrefix
  }

  getScript (): Script {
    if (!this.valid) {
      this.validate()
    }

    if (!this.valid) {
      throw new Error('InvalidDefiAddress')
    }

    return {
      stack: [
        OP_CODES.OP_HASH160,
        new OP_PUSHDATA(Buffer.from(this.hex.substring(2, 42), 'hex'), 'little'),
        OP_CODES.OP_EQUAL
      ]
    }
  }
}
