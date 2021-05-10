import bs58 from 'bs58'
import { bech32 } from 'bech32'
import { SHA256 } from '@defichain/jellyfish-crypto'
import { getNetwork, Network, NetworkName } from '@defichain/jellyfish-network'
import { Script } from '@defichain/jellyfish-transaction'
import * as Regex from './constant/Regex'

export type AddressType = 'Unknown' | 'P2PKH' | 'P2SH' | 'P2WPKH' | 'P2WSH'
export type Encoding = 'utf8' | 'hex'

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

  abstract validators(): Validator[]
  abstract getScript(): Script

  static from<T extends DeFiAddress>(net: NetworkName, address: string): DeFiAddress | T {
    const network = getNetwork(net)
    const possible: Map<AddressType, DeFiAddress> = new Map()
    possible.set('Unknown', new UnknownTypeAddress(network, address))
    possible.set('P2PKH', Base58Address.build<P2PKH>(network, address, P2PKH))
    possible.set('P2SH', Base58Address.build<P2SH>(network, address, P2SH))
    possible.set('P2WPKH', Bech32Address.build<P2WPKH>(network, address, P2WPKH))
    possible.set('P2WSH', Bech32Address.build<P2WSH>(network, address, P2WSH))

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

  validate() {
    return this.validators().every(validator => validator())
  }
}

export abstract class Base58Address extends DeFiAddress {
  static MIN_LENGTH = 26
  static MAX_LENGTH = 34

  // [ prefix, 20 bytes data, 4 bytes checksum ]
  hex: string

  constructor(network: Network, utf8String: string, hex: string, validated: boolean, type: AddressType) {
    super(network, utf8String, validated, type)
    this.hex = hex
  }

  validators (): Validator[] {
    const that = this
    return [
      () => (that.utf8String.length >= Base58Address.MIN_LENGTH),
      () => (that.utf8String.length <= Base58Address.MAX_LENGTH),
      () => Regex.BASE_58.test(that.utf8String),
      () => {
        const bytes = bs58.decode(that.utf8String)
        console.log('prefix', bytes.toString('hex').substr(0, 2))
        return bytes.toString('hex').substr(0, 2) === that.getPrefixString()
      },
    ]
  }

  abstract getPrefix(): number
  getPrefixString(): string {
    return Buffer.from([this.getPrefix()]).toString('hex')
  }

  static build<T extends Base58Address>(network: Network, utf8String: string, addressClass: new (...a: any[]) => T): T {
    return new addressClass(network, utf8String, bs58.decode(utf8String).toString('hex'))
  }
}

export abstract class Bech32Address extends DeFiAddress {
  static MAX_LENGTH = 90
  static MAX_HUMAN_READABLE_LENGTH = 83

  validators (): Validator[] {
    const that: Bech32Address = this
    return [
      () => {
        const lastONE = that.utf8String.lastIndexOf('1')
        return new RegExp(`^${that.getHrp()}`).test(that.utf8String.substring(0, lastONE))
      },
      () => {
        const lastONE = that.utf8String.lastIndexOf('1')
        return Regex.BECH_32.test(that.utf8String.substr(lastONE + 1))
      }
    ]
  }

  getHrp(): string {
    return this.network.bech32.hrp
  }

  static build<T extends Bech32Address>(network: Network, raw: string, addressClass: new (...a: any[]) => T): T {
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
    return new addressClass(network, raw, words, valid)
  }
}

export class UnknownTypeAddress extends DeFiAddress {
  constructor (network: Network, raw: string) {
    super(network, raw, false, 'Unknown')
  }

  validators(): Validator[] {
    return []
  }

  validate() {
    return false
  }

  getScript(): Script {
    throw new Error('InvalidDeFiAddress')
  }
}

export class P2SH extends Base58Address {
  static SAMPLE = '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy'
  static SCRIPT_HASH_LENGTH = 50
  // scriptHash: 
  
  constructor (network: Network, utf8String: string, hex: string, validated?: boolean) {
    super(network, utf8String, hex, !!validated, 'P2SH')
  }

  validators(): Validator[] {
    const that = this
    return [
      ...super.validators(),
      () => {
        // checksum validation
        const hexBuffer = Buffer.from(that.hex, 'hex')
        let storedChecksum = Buffer.alloc(4)
        let scriptOnly = Buffer.alloc(21)
        hexBuffer.copy(storedChecksum, 0, 21, 25)
        hexBuffer.copy(scriptOnly, 0, 0, 21)
        const calculated = SHA256(SHA256(scriptOnly))
        return storedChecksum.toString('hex') === calculated.toString('hex').substr(0, 8)
      }
    ]
  }

  getPrefix() {
    return this.network.scriptHashPrefix
  }

  getScript(): Script {
    throw new Error('TODO')
  }
}

export class P2PKH extends Base58Address {
  static SAMPLE = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2'

  constructor (network: Network, utf8String: string, hex: string, validated?: boolean) {
    super(network, utf8String, hex, !!validated, 'P2PKH')
  }

  validators(): Validator[] {
    const that = this
    return [
      ...super.validators(),
      () => {
        // checksum validation
        const hexBuffer = Buffer.from(that.hex, 'hex')
        let storedChecksum = Buffer.alloc(4)
        let scriptOnly = Buffer.alloc(21)
        hexBuffer.copy(storedChecksum, 0, 21, 25)
        hexBuffer.copy(scriptOnly, 0, 0, 21)
        const calculated = SHA256(SHA256(scriptOnly))
        return storedChecksum.toString('hex') === calculated.toString('hex').substr(0, 8)
      }
    ]
  }

  getPrefix() {
    return this.network.pubKeyHashPrefix
  }

  getPubKeyHas(): string {
    return this.hex.substring(4, 44)
  }

  getScript(): Script {
    throw new Error('TODO')
  }
}

export class P2WPKH extends Bech32Address {
  static SAMPLE = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'
  static LENGTH = 42
  static PUB_KEY_HASH_LENGTH = 20

  // 20 bytes (exclude version)
  pubKeyHash: Buffer

  constructor (network: Network, utf8String: string, numbers: Buffer, validated?: boolean) {
    super(network, utf8String, !!validated, 'P2WPKH')
    this.pubKeyHash = numbers
  }

  validators(): Validator[] {
    const rawAdd = this.utf8String
    const network = this.network
    return [
      ...super.validators(),
      () => (rawAdd.length <= P2WPKH.LENGTH),
      () => (rawAdd.length === P2WPKH.LENGTH)
    ]
  }

  getHrp (): string {
    return this.network.bech32.hrp
  }

  getScript(): Script {
    throw new Error('TODO')
  }

  static to(network: Network, pubKeyHash: string): string {
    const numbers = Buffer.from(pubKeyHash, 'hex')

    if (pubKeyHash.length !== P2WPKH.PUB_KEY_HASH_LENGTH) {
      throw new Error('InvalidPubKeyHashLength')
    }
    const numberWithVersion = bech32.fromWords([network.pubKeyHashPrefix, ...numbers])
    const utf8 = bech32.encode(network.bech32.hrp, numberWithVersion)
    const address = new P2WPKH(network, utf8, numbers, true)

    return address.utf8String
  }
}

export class P2WSH extends Bech32Address {
  static SAMPLE = 'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3'
  static LENGTH = 62
  static SCRIPT_HASH_LENGTH = 32

  // redeem script (exclude version)
  redeemScript: Buffer

  constructor (network: Network, utf8String: string, numbers: Buffer, validated?: boolean) {
    super(network, utf8String, !!validated, 'P2WSH')
    this.redeemScript = numbers
  }

  validators (): Validator[] {
    const rawAdd = this.utf8String
    return [
      ...super.validators(),
      () => (rawAdd.length <= P2WSH.LENGTH),
      () => (rawAdd.length === P2WSH.LENGTH)
    ]
  }

  static to(network: Network, scriptHash: string): string {
    const numbers = Buffer.from(scriptHash, 'hex')

    if (scriptHash.length !== P2WSH.SCRIPT_HASH_LENGTH) {
      throw new Error('InvalidScriptHashLength')
    }
    const numberWithVersion = bech32.fromWords([network.pubKeyHashPrefix, ...numbers])
    const utf8 = bech32.encode(network.bech32.hrp, numberWithVersion)
    const address = new P2WSH(network, utf8, numbers, true)

    return address.utf8String
  }

  getScript(): Script {
    throw new Error('TODO')
  }
}
