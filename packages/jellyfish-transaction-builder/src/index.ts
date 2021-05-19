import { P2WPKHTxnBuilder } from './txn/txn_builder'
import { TxnBuilderDex } from './txn/txn_builder_dex'
import { TxnBuilderUtxo } from './txn/txn_builder_utxo'

export * from './provider'
export * from './txn/txn_fee'
export * from './txn/txn_builder'
export * from './txn/txn_builder_dex'
export * from './txn/txn_builder_utxo'

/**
 * All in one transaction builder.
 * Currently only support sending from P2PKH operations.
 */
export class P2WPKHTransactionBuilder extends P2WPKHTxnBuilder {
  public readonly dex = new TxnBuilderDex(this.feeProvider, this.prevoutProvider, this.ellipticPairProvider)
  public readonly utxo = new TxnBuilderUtxo(this.feeProvider, this.prevoutProvider, this.ellipticPairProvider)
}
