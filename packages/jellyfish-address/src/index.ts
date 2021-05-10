import bs58 from 'bs58'
import { bech32 } from 'bech32'
import { SHA256 } from '@defichain/jellyfish-crypto'
import { getNetwork, Network, NetworkName } from '@defichain/jellyfish-network'
import { Script } from '@defichain/jellyfish-transaction'
import { OP_CODES, OP_PUSHDATA } from '@defichain/jellyfish-transaction/src/script'
import * as Regex from './constant/Regex'

export type AddressType = 'Unknown' | 'P2PKH' | 'P2SH' | 'P2WPKH' | 'P2WSH'

type Validator = () => boolean

export abstract class DeFiAddress {
  network: Network
  utf8String: string
  type: AddressType
  valid: boolean
  validatorPassed: number

  constructor (network: Network, utf8String: string, valid: boolean, type: AddressType) {
    this.network = network
    this.utf8String = utf8String
    this.valid = valid
    this.type = type
    this.validatorPassed = 0
  }

  abstract validators (): Validator[]
  abstract getScript (): Script

  validate (): boolean {
    return this.validators().every(validator => validator())
  }

  /**
   * When insist to use the "network" decoded from raw address, instead of passing one based on running application environment
   * @param address raw human readable address (utf-8)
   * @returns DefiAddress or a child class
   */
  static guess (address: string): DeFiAddress {
    const networks: NetworkName[] = ['mainnet', 'testnet', 'regtest']
    const defaultOne = new UnknownTypeAddress(getNetwork('mainnet'), address)
    for (let i = 0; i < networks.length; i += 1) {
      const guessed = DeFiAddress.from(networks[i], address)
      if (guessed.valid) {
        return guessed
      }
    }
    return defaultOne
  }

  /**
   * @param net to be validated against the decoded one from the raw address
   * @param address raw human readable address (utf-8)
   * @returns DefiAddress or a child class
   */
  static from<T extends DeFiAddress>(net: NetworkName, address: string): DeFiAddress | T {
    const network = getNetwork(net)
    const possible: Map<AddressType, DeFiAddress | T> = new Map()
    possible.set('Unknown', new UnknownTypeAddress(network, address))
    possible.set('P2PKH', Base58Address.fromAddress<P2PKH>(network, address, P2PKH))
    possible.set('P2SH', Base58Address.fromAddress<P2SH>(network, address, P2SH))
    possible.set('P2WPKH', Bech32Address.fromAddress<P2WPKH>(network, address, P2WPKH))
    possible.set('P2WSH', Bech32Address.fromAddress<P2WSH>(network, address, P2WSH))

    possible.forEach((val) => {
      // re-validate
      val.valid = true
      val.validators().forEach(vldt => {
        const passed = vldt()
        val.valid = val.valid && passed
        if (passed) {
          val.validatorPassed += 1
        } else {
          val.valid = false
        }
      })
    })

    // default, if none of other passed all validators
    let highestKey: AddressType = 'Unknown'
    let highestCount = 0

    possible.forEach((val, key) => {
      if (val.validatorPassed > highestCount) {
        highestKey = key
        highestCount = val.validatorPassed
      }
    })
    return (possible.get(highestKey) as T)
  }
}

export abstract class Base58Address extends DeFiAddress {
  static MIN_LENGTH = 26
  static MAX_LENGTH = 34

  // [ prefix, 20 bytes data, 4 bytes checksum ]
  hex: string
  static DATA_HEX_LENGTH = 40 // hex char count

  constructor (network: Network, utf8String: string, hex: string, validated: boolean, type: AddressType) {
    super(network, utf8String, validated, type)
    this.hex = hex
  }

  abstract getPrefix (): number

  validators (): Validator[] {
    return [
      () => (this.utf8String.length >= Base58Address.MIN_LENGTH),
      () => (this.utf8String.length <= Base58Address.MAX_LENGTH),
      () => Regex.BASE_58.test(this.utf8String),
      () => {
        const bytes = bs58.decode(this.utf8String)
        return bytes.toString('hex').substr(0, 2) === this.getPrefixString()
      },
      () => {
        // checksum validation
        const hexBuffer = Buffer.from(this.hex, 'hex')
        const storedChecksum = Buffer.alloc(4)
        const scriptOnly = Buffer.alloc(21)
        hexBuffer.copy(storedChecksum, 0, 21, 25)
        hexBuffer.copy(scriptOnly, 0, 0, 21)
        const calculated = SHA256(SHA256(scriptOnly))
        return storedChecksum.toString('hex') === calculated.toString('hex').substr(0, 8)
      }
    ]
  }

  getPrefixString (): string {
    return Buffer.from([this.getPrefix()]).toString('hex')
  }

  static fromAddress<T extends Base58Address>(network: Network, utf8String: string, AddressClass: new (...a: any[]) => T): T {
    return new AddressClass(network, utf8String, bs58.decode(utf8String).toString('hex'))
  }

  static to<T extends Base58Address>(net: NetworkName, h160: string, AddressClass: new (...a: any[]) => T): Base58Address | T {
    if (h160.length !== Base58Address.DATA_HEX_LENGTH) {
      throw new Error('InvalidDataLength')
    }

    const network = getNetwork(net)
    const prefixed = Buffer.from([network.pubKeyHashPrefix, ...Buffer.from(h160, 'hex')])
    const checksum = SHA256(SHA256(prefixed)).toString('hex').substr(0, 8)
    const fullAddressInHex = `${prefixed.toString('hex')}${checksum}`
    return new AddressClass(network, bs58.encode(Buffer.from(fullAddressInHex, 'hex')), fullAddressInHex, true)
  }
}

export abstract class Bech32Address extends DeFiAddress {
  static MAX_LENGTH = 90
  static MAX_HUMAN_READABLE_LENGTH = 83

  validators (): Validator[] {
    return [
      () => {
        const lastONE = this.utf8String.lastIndexOf('1')
        return new RegExp(`^${this.getHrp()}`).test(this.utf8String.substring(0, lastONE))
      },
      () => {
        const lastONE = this.utf8String.lastIndexOf('1')
        return Regex.BECH_32.test(this.utf8String.substr(lastONE + 1))
      }
    ]
  }

  getHrp (): string {
    return this.network.bech32.hrp
  }

  static fromAddress<T extends Bech32Address>(network: Network, raw: string, AddressClass: new (...a: any[]) => T): T {
    let valid: boolean
    let prefix: string
    let words: number[] = []
    try {
      const decoded = bech32.decode(raw)
      valid = true
      prefix = decoded.prefix
      words = decoded.words.slice(1) // exclude version byte

      if (prefix !== network.bech32.hrp) {
        valid = false
      }
    } catch (e) {
      valid = false
    }
    return new AddressClass(network, raw, words, valid)
  }
}

export class UnknownTypeAddress extends DeFiAddress {
  constructor (network: Network, raw: string) {
    super(network, raw, false, 'Unknown')
  }

  validators (): Validator[] {
    return []
  }

  validate (): boolean {
    return false
  }

  getScript (): Script {
    throw new Error('InvalidDeFiAddress')
  }
}

export class P2SH extends Base58Address {
  static SAMPLE = '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy'
  static SCRIPT_HASH_LENGTH = 50

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

export class P2PKH extends Base58Address {
  static SAMPLE = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2'

  constructor (network: Network, utf8String: string, hex: string, validated: boolean = false) {
    super(network, utf8String, hex, validated, 'P2PKH')
  }

  getPrefix (): number {
    return this.network.pubKeyHashPrefix
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
        OP_CODES.OP_DUP,
        OP_CODES.OP_HASH160,
        new OP_PUSHDATA(Buffer.from(this.hex.substring(2, 42), 'hex'), 'little'),
        OP_CODES.OP_EQUALVERIFY,
        OP_CODES.OP_CHECKSIG
      ]
    }
  }
}

export class P2WPKH extends Bech32Address {
  static SAMPLE = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'
  static LENGTH = 42
  static PUB_KEY_HASH_LENGTH = 20

  // 20 bytes, data only, 40 char
  pubKeyHash: string

  constructor (network: Network, utf8String: string, pubKeyHash: string, validated: boolean = false) {
    super(network, utf8String, validated, 'P2WPKH')
    this.pubKeyHash = pubKeyHash
  }

  validators (): Validator[] {
    const rawAdd = this.utf8String
    return [
      ...super.validators(),
      () => (rawAdd.length <= P2WPKH.LENGTH),
      () => (rawAdd.length === P2WPKH.LENGTH)
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

  static to (network: Network, h160: string): string {
    if (h160.length !== P2WPKH.PUB_KEY_HASH_LENGTH) {
      throw new Error('InvalidPubKeyHashLength')
    }

    const numbers = Buffer.from(h160, 'hex')
    const numberWithVersion = bech32.fromWords([network.pubKeyHashPrefix, ...numbers])
    const utf8 = bech32.encode(network.bech32.hrp, numberWithVersion)
    const address = new P2WPKH(network, utf8, h160, true)

    return address.utf8String
  }
}

export class P2WSH extends Bech32Address {
  static SAMPLE = 'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3'
  static LENGTH = 62
  static SCRIPT_HASH_LENGTH = 32

  // 32 bytes, data only, 64 char
  data: string

  constructor (network: Network, utf8String: string, data: string, validated: boolean = false) {
    super(network, utf8String, validated, 'P2WSH')
    this.data = data
  }

  validators (): Validator[] {
    const rawAdd = this.utf8String
    return [
      ...super.validators(),
      () => (rawAdd.length <= P2WSH.LENGTH),
      () => (rawAdd.length === P2WSH.LENGTH)
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

  static to (network: Network, hex: string): string {
    if (hex.length !== P2WSH.SCRIPT_HASH_LENGTH) {
      throw new Error('InvalidScriptHashLength')
    }

    const numbers = Buffer.from(hex, 'hex')
    const numberWithVersion = bech32.fromWords([network.pubKeyHashPrefix, ...numbers])
    const utf8 = bech32.encode(network.bech32.hrp, numberWithVersion)
    const address = new P2WSH(network, utf8, hex, true)

    return address.utf8String
  }
}
