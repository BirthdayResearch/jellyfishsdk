import { DfTx } from '@defichain/jellyfish-transaction'
import { NetworkName } from '@defichain/jellyfish-network'
import { ActiveAddress } from '../ActiveAddress'

export abstract class DfTxAddressParser<T> {
  abstract OP_CODE: number
  abstract extract (tx: DfTx<T>): ActiveAddress[]

  constructor (protected readonly network: NetworkName) {}
}
