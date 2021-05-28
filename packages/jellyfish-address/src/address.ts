import { Network } from '@defichain/jellyfish-network'
import { Script } from '@defichain/jellyfish-transaction'

export type AddressType = 'Unknown' | 'P2PKH' | 'P2SH' | 'P2WPKH' | 'P2WSH'
export type Validator = () => boolean

export abstract class Address {
  readonly network?: Network
  readonly utf8String: string
  readonly buffer?: Buffer
  readonly type: AddressType
  readonly valid: boolean

  constructor (network: Network | undefined, utf8String: string, buffer: Buffer | undefined, valid: boolean, type: AddressType) {
    this.network = network
    this.utf8String = utf8String
    this.valid = valid
    this.type = type
    this.buffer = buffer

    if (valid && (
      this.network === undefined ||
      this.buffer === undefined
    )) {
      throw new Error('InvalidDefiAddress')
    }
  }

  /**
   * should throw if called with address.valid === false
   */
  abstract getScript (): Script

  getNetwork (): Network {
    if (!this.valid) {
      throw new Error('InvalidDefiAddress')
    }
    return this.network as Network
  }

  getBuffer (): Buffer {
    if (!this.valid) {
      throw new Error('InvalidDefiAddress')
    }
    return this.buffer as Buffer
  }
}
