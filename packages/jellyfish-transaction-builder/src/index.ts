import { P2WPKHTxnBuilder } from './txn/txn_builder'
import { TxnBuilderDex } from './txn/txn_builder_dex'
import { TxnBuilderUtxo } from './txn/txn_builder_utxo'
import { TxnBuilderAccount } from './txn/txn_builder_account'
import { TxnBuilderOracles } from './txn/txn_builder_oracles'
import { TxnBuilderLiqPool } from './txn/txn_builder_liq_pool'
import { TxnBuilderLoans } from './txn/txn_builder_loans'

export * from './provider'
export * from './txn/txn_fee'
export * from './txn/txn_builder'
export * from './txn/txn_builder_dex'
export * from './txn/txn_builder_utxo'
export * from './txn/txn_builder_account'
export * from './txn/txn_builder_oracles'
export * from './txn/txn_builder_loans'
export * from './txn/txn_builder_liq_pool'

/**
 * All in one transaction builder.
 * Currently only support sending from P2PKH operations.
 */
export class P2WPKHTransactionBuilder extends P2WPKHTxnBuilder {
  public readonly dex = new TxnBuilderDex(this.feeProvider, this.prevoutProvider, this.ellipticPairProvider)
  public readonly utxo = new TxnBuilderUtxo(this.feeProvider, this.prevoutProvider, this.ellipticPairProvider)
  public readonly account = new TxnBuilderAccount(this.feeProvider, this.prevoutProvider, this.ellipticPairProvider)
  public readonly liqPool = new TxnBuilderLiqPool(this.feeProvider, this.prevoutProvider, this.ellipticPairProvider)
  public readonly oracles = new TxnBuilderOracles(this.feeProvider, this.prevoutProvider, this.ellipticPairProvider)
  public readonly loans = new TxnBuilderLoans(this.feeProvider, this.prevoutProvider, this.ellipticPairProvider)
}
