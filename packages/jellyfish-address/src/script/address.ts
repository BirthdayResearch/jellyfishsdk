import { Script } from '@defichain/jellyfish-transaction'
import { NetworkName } from '@defichain/jellyfish-network'

export type AddressType = 'p2wpkh' | 'p2wsh' | 'p2sh' | 'p2pkh'

export interface Address {
  type: AddressType
  address: string
  script: Script
  network: NetworkName
}
