import { bech32 } from 'bech32'
import { getNetwork, Network, NetworkName } from '@defichain/jellyfish-network'
import { OP_CODES, OP_PUSHDATA, Script } from '@defichain/jellyfish-transaction'

import { Bech32Address } from './bech32_address'
import { Validator } from './address'

export class P2WSH extends Bech32Address {
  // the raw utf8, eg bc1...
  // supposed to be 62, regtest prefix is longer
  static MAX_LENGTH = 64

  // 32 bytes, data only, 64 char
  data: string
  static SCRIPT_HASH_LENGTH = 64

  constructor (network: Network, utf8String: string, data: string, validated: boolean = false) {
    super(network, utf8String, validated, 'P2WSH')
    this.data = data
  }

  // bcrt1ncd7qa2cafwv3cpw68vqczg3qj904k2f4lard4wrj50rzkwmagvs3ttd5f
  validators (): Validator[] {
    return [
      ...super.validators(),
      () => (this.utf8String.length <= P2WSH.MAX_LENGTH),
      () => (this.data.length === P2WSH.SCRIPT_HASH_LENGTH)
    ]
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
}

function isScriptP2WSH (script: Script): boolean {
  return script.stack.length === 2 &&
    script.stack[0].type === OP_CODES.OP_0.type &&
    script.stack[1].type === 'OP_PUSHDATA' &&
    (script.stack[1] as OP_PUSHDATA).length() === 32
}

export function fromScriptP2WPKH (script: Script, network: NetworkName): string | undefined {
  if (!isScriptP2WSH(script)) {
    return undefined
  }

  const hash = script.stack[1] as OP_PUSHDATA
  const buffer = Buffer.from(hash.hex, 'hex')
  const hrp = getNetwork(network).bech32.hrp
  return undefined
  // return Bech32.fromHash160(buffer, hrp, 0x00)
}
