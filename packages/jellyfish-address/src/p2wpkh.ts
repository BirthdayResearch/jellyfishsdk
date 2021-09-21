import { bech32 } from 'bech32'
import { getNetwork, Network, NetworkName } from '@defichain/jellyfish-network'
import { OP_CODES, OP_PUSHDATA, Script } from '@defichain/jellyfish-transaction'

import { Bech32Address } from './bech32_address'
import { Validator } from './address'
import { Bech32 } from '@defichain/jellyfish-crypto'

export class P2WPKH extends Bech32Address {
  static SAMPLE = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'
  static LENGTH_EXCLUDE_HRP = 39 // exclude hrp and separator

  // 20 bytes, data only, 40 char
  pubKeyHash: string
  static PUB_KEY_HASH_LENGTH = 40

  constructor (network: Network, utf8String: string, pubKeyHash: string, validated: boolean = false) {
    super(network, utf8String, validated, 'P2WPKH')
    this.pubKeyHash = pubKeyHash
  }

  validators (): Validator[] {
    const rawAdd = this.utf8String
    return [
      ...super.validators(),
      () => (rawAdd.length <= P2WPKH.LENGTH_EXCLUDE_HRP + this.getHrp().length + 1),
      () => (rawAdd.length === P2WPKH.LENGTH_EXCLUDE_HRP + this.getHrp().length + 1),
      () => (this.pubKeyHash.length === P2WPKH.PUB_KEY_HASH_LENGTH)
    ]
  }

  getHrp (): string {
    return this.network.bech32.hrp
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
        OP_CODES.OP_0,
        new OP_PUSHDATA(Buffer.from(this.pubKeyHash, 'hex'), 'little')
      ]
    }
  }

  /**
   * @param net network
   * @param hex data, public key hash (20 bytes, 40 characters)
   * @param witnessVersion default 0
   * @returns
   */
  static to (net: Network | NetworkName, h160: string, witnessVersion = 0x00): P2WPKH {
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
}

function isScriptP2WPKH (script: Script): boolean {
  return script.stack.length === 2 &&
    script.stack[0].type === OP_CODES.OP_0.type &&
    script.stack[1].type === 'OP_PUSHDATA' &&
    (script.stack[1] as OP_PUSHDATA).length() === 20
}

export function fromScriptP2WPKH (script: Script, network: NetworkName): string | undefined {
  if (!isScriptP2WPKH(script)) {
    return undefined
  }

  const hash = script.stack[1] as OP_PUSHDATA
  const buffer = Buffer.from(hash.hex, 'hex')
  const hrp = getNetwork(network).bech32.hrp
  return Bech32.fromHash160(buffer, hrp, 0x00)
}
