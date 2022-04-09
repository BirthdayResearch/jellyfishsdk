import { DfTx } from '@defichain/jellyfish-transaction'
import { NetworkName } from '@defichain/jellyfish-network'

export abstract class DfTxAddressParser<T> {
  abstract OP_CODE: number
  abstract extract (tx: DfTx<T>): string[]

  constructor (protected readonly network: NetworkName) {}
}
