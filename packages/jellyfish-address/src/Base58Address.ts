import bs58 from 'bs58'
import { SHA256 } from '@defichain/jellyfish-crypto'
import { getNetwork, Network, NetworkName } from '@defichain/jellyfish-network'
import { Address, AddressType, Validator } from './Address'

export abstract class Base58Address extends Address {
  static MIN_LENGTH = 26
  static MAX_LENGTH = 35

  // [ prefix, 20 bytes data, 4 bytes checksum ]
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
          const bytes = bs58.decode(this.utf8String)
          return bytes.toString('hex').substr(0, 2) === this.getPrefixString()
        } catch (e) {
          return false
        }
      },
      () => {
        try {
          // checksum validation
          const hexBuffer = Buffer.from(this.hex, 'hex')
          const storedChecksum = Buffer.alloc(4)
          const scriptOnly = Buffer.alloc(21)
          hexBuffer.copy(storedChecksum, 0, 21, 25)
          hexBuffer.copy(scriptOnly, 0, 0, 21)
          const calculated = SHA256(SHA256(scriptOnly))
          return storedChecksum.toString('hex') === calculated.toString('hex').substr(0, 8)
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
      const hex = bs58.decode(utf8String).toString('hex')
      return new AddressClass(network, utf8String, hex)
    } catch (e) {
      // non b58 string, invalid address
      return new AddressClass(network, utf8String, '', false, 'Unknown')
    }
  }

  static to<T extends Base58Address>(net: NetworkName | Network, h160: string, AddressClass: new (...a: any[]) => T): Base58Address | T {
    if (h160.length !== Base58Address.DATA_HEX_LENGTH) {
      throw new Error('InvalidDataLength')
    }

    const network = typeof net === 'string' ? getNetwork(net) : net
    const prefixed = Buffer.from([network.pubKeyHashPrefix, ...Buffer.from(h160, 'hex')])
    const checksum = SHA256(SHA256(prefixed)).toString('hex').substr(0, 8)
    const fullAddressInHex = `${prefixed.toString('hex')}${checksum}`
    return new AddressClass(network, bs58.encode(Buffer.from(fullAddressInHex, 'hex')), fullAddressInHex, true)
  }
}
