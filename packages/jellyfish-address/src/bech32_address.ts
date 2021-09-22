import { Network } from '@defichain/jellyfish-network'
import { bech32 } from 'bech32'
import { Address, AddressTypeDeprecated, Validator } from './address'

export abstract class Bech32Address extends Address {
  static MAX_LENGTH = 90
  static MAX_HUMAN_READABLE_LENGTH = 83

  constructor (network: Network, utf8String: string, valid: boolean, addressType: AddressTypeDeprecated) {
    super(network, utf8String.toLowerCase(), valid, addressType)
  }

  validators (): Validator[] {
    return [
      () => (new RegExp(`^${this.getHrp()}`).test(this.utf8String)),
      () => {
        const charset = '[02-9ac-hj-np-z]' // 0-9, a-z, and reject: [1, b, i, o]
        const arr = this.utf8String.split('1')
        const excludeHrp = arr[arr.length - 1]
        const regex = new RegExp(`${charset}{${excludeHrp.length}}$`)
        return regex.test(excludeHrp)
      }
    ]
  }

  getHrp (): string {
    return this.network.bech32.hrp
  }

  static fromAddress<T extends Bech32Address>(network: Network, raw: string, AddressClass: new (...a: any[]) => T): T {
    let valid: boolean
    let prefix: string
    let data: string = ''
    try {
      const decoded = bech32.decode(raw)
      valid = true
      prefix = decoded.prefix
      const trimmedVersion = decoded.words.slice(1)
      data = Buffer.from(bech32.fromWords(trimmedVersion)).toString('hex')

      if (prefix !== network.bech32.hrp) {
        valid = false
      }
    } catch (e) {
      valid = false
    }

    return new AddressClass(network, raw, data, valid)
  }
}
