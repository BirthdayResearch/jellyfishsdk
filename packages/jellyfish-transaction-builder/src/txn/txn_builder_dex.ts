import { OP_CODES, Script, TransactionSegWit, PoolSwap, CompositeSwap } from '@defichain/jellyfish-transaction'
import { P2WPKHTxnBuilder } from './txn_builder'

export class TxnBuilderDex extends P2WPKHTxnBuilder {
  /**
   * Requires at least 0.01 DFI to create transaction, actual fees are much lower.
   *
   * @param {PoolSwap} poolSwap txn to create
   * @param {Script} changeScript to send unspent to after deducting the fees
   */
  async poolSwap (poolSwap: PoolSwap, changeScript: Script): Promise<TransactionSegWit> {
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_POOL_SWAP(poolSwap),
      changeScript
    )
  }

  /**
   * Requires at least 0.01 DFI to create transaction, actual fees are much lower.
   *
   * @param {CompositeSwap} compositeSwap txn to create
   * @param {Script} changeScript to send unspent to after deducting the fees
   */
  async compositeSwap (compositeSwap: CompositeSwap, changeScript: Script): Promise<TransactionSegWit> {
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_COMPOSITE_SWAP(compositeSwap),
      changeScript
    )
  }
}
