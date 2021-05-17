import { Bs58 } from '@defichain/jellyfish-crypto'
import { Network } from '@defichain/jellyfish-network'
import { Address, AddressType, Validator } from './Address'

export abstract class Base58Address extends Address {
  static MIN_LENGTH = 26
  static MAX_LENGTH = 35

  // 20 bytes data
  hex: string
  static DATA_HEX_LENGTH = 40 // hex char count

  constructor (network: Network, utf8String: string, hex: string, valid: boolean, type: AddressType) {
    super(network, utf8String, valid, type)
    this.hex = hex
  }

  abstract getPrefix (): number

  validators (): Validator[] {
    return [
      () => (this.utf8String.length >= Base58Address.MIN_LENGTH),
      () => (this.utf8String.length <= Base58Address.MAX_LENGTH),
      () => {
        const charset = '[1-9A-HJ-NP-Za-km-z]'
        return new RegExp(`${charset}{${this.utf8String.length}}$`).test(this.utf8String)
      },
      () => {
        try {
          const { prefix } = Bs58.toHash160(this.utf8String) // built in checksum check
          return prefix === this.getPrefix()
        } catch (e) {
          return false
        }
      },
      () => {
        try {
          const { buffer } = Bs58.toHash160(this.utf8String) // built in checksum check
          return buffer.toString('hex') === this.hex
        } catch (e) {
          return false
        }
      }
    ]
  }

  getPrefixString (): string {
    return Buffer.from([this.getPrefix()]).toString('hex')
  }

  static fromAddress<T extends Base58Address>(network: Network, utf8String: string, AddressClass: new (...a: any[]) => T): T {
    try {
      const { buffer } = Bs58.toHash160(utf8String)
      return new AddressClass(network, utf8String, buffer.toString('hex'))
    } catch (e) {
      // non b58 string, invalid address
      return new AddressClass(network, utf8String, '', false, 'Unknown')
    }
  }
}
