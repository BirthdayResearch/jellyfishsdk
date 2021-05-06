import * as Regex from './constant/Regex'

type AddressType = 'Unknown' | 'P2PKH' | 'P2SH' | 'P2WPKH' | 'P2WSH'

type Validator = () => boolean

export abstract class Address {
  type: AddressType
  raw: string
  valid: boolean
  validatorPassed: number

  constructor (raw: string, valid: boolean, type: AddressType) {
    this.raw = raw
    this.valid = valid
    this.type = type
    this.validatorPassed = 0
  }

  abstract validators (): Validator[]

  static guess (raw: string): Address {
    const possible: Map<AddressType, Address> = new Map()
    possible.set('Unknown', new UnknownTypeAddress(raw))
    possible.set('P2PKH', new P2PKH(raw))
    possible.set('P2SH', new P2SH(raw))
    possible.set('P2WPKH', new P2WPKH(raw))
    possible.set('P2WSH', new P2WSH(raw))

    possible.forEach((val, key) => {
      val.validators().forEach(vldt => {
        if (vldt()) {
          val.validatorPassed += 1
        } else {
          val.valid = false
        }
      })
    })

    // default, if none of other passed all validators
    let highestKey: AddressType = 'Unknown'
    const highestCount = 0

    possible.forEach((val, key) => {
      if (val.valid && val.validatorPassed > highestCount) {
        highestKey = key
      }
    })

    return (possible.get(highestKey) as Address)
  }
}

export abstract class Base58Address extends Address {
  static MIN_LENGTH = 26
  static MAX_LENGTH = 34

  validators (): Validator[] {
    const val = this.raw
    return [
      () => (val.length >= Base58Address.MIN_LENGTH),
      () => (val.length <= Base58Address.MAX_LENGTH),
      () => Regex.BASE_58.test(val)
    ]
  }
}

export abstract class Bech32Address extends Address {
  static MAX_LENGTH = 90
  static MAX_HUMAN_READABLE_LENGTH = 83
  static SEPARATOR = '1'

  validators (): Validator[] {
    const val = this.raw
    return [
      () => Regex.BECH_32.test(val),
      () => val.lastIndexOf(Bech32Address.SEPARATOR) <= Bech32Address.MAX_HUMAN_READABLE_LENGTH,
      () => {
        const lastONE = val.lastIndexOf(Bech32Address.SEPARATOR)
        return Regex.BECH_32.test(val.substr(lastONE + 1))
      }
    ]
  }

  abstract getHumanReadable (): string
}

export class UnknownTypeAddress extends Address {
  constructor (raw: string) {
    super(raw, true, 'Unknown')
  }

  validators (): Validator[] {
    return []
  }
}

export class P2SH extends Base58Address {
  static SAMPLE = '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy'
  constructor (raw: string) {
    super(raw, true, 'P2SH')
  }

  validators (): Validator[] {
    const rawAdd = this.raw
    return [
      ...super.validators(),
      () => new RegExp(/^3/).test(rawAdd)
    ]
  }
}

export class P2PKH extends Base58Address {
  static SAMPLE = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2'

  constructor (raw: string) {
    super(raw, true, 'P2PKH')
  }

  validators (): Validator[] {
    const rawAdd = this.raw
    return [
      ...super.validators(),
      () => new RegExp(/^1/).test(rawAdd)
    ]
  }
}

export class P2WPKH extends Bech32Address {
  static SAMPLE = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'
  static LENGTH = 42
  static HUMAN_READABLE = 'bc1' // morph for different network
  static HUMAN_READABLE_REGEX = [
    new RegExp(/^bc1/)
    // new RegExp(/^tb1/)
  ]

  constructor (raw: string) {
    super(raw, true, 'P2WPKH')
  }

  validators (): Validator[] {
    const rawAdd = this.raw
    return [
      ...super.validators(),
      () => !(P2WPKH.HUMAN_READABLE_REGEX.find(rgx => rgx.test(rawAdd)) == null),
      () => (rawAdd.length <= P2WPKH.LENGTH),
      () => (rawAdd.length === P2WPKH.LENGTH)
    ]
  }

  getHumanReadable (): string {
    return P2WPKH.HUMAN_READABLE
  }
}

export class P2WSH extends Bech32Address {
  static SAMPLE = 'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3'
  static LENGTH = 62
  static HUMAN_READABLE = 'bc1' // morph for different network
  static HUMAN_READABLE_REGEX = [
    new RegExp(/^bc1/)
    // new RegExp(/^tb1/)
  ]

  constructor (raw: string) {
    super(raw, true, 'P2WSH')
  }

  validators (): Validator[] {
    const rawAdd = this.raw
    return [
      ...super.validators(),
      () => !(P2WSH.HUMAN_READABLE_REGEX.find(rgx => rgx.test(rawAdd)) == null),
      () => (rawAdd.length <= P2WSH.LENGTH),
      () => (rawAdd.length === P2WSH.LENGTH)
    ]
  }

  getHumanReadable (): string {
    return P2WSH.HUMAN_READABLE
  }
}
