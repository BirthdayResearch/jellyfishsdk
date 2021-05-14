import { OP_CODES, Script, TransactionSegWit } from '@defichain/jellyfish-transaction'
import { PoolSwap } from '@defichain/jellyfish-transaction/dist/script/defi/dftx_pool'
import { P2WPKHTxnBuilder } from './txn_builder'

export class TxnBuilderDex extends P2WPKHTxnBuilder {
  /**
   * Requires at least 0.01 DFI to create transaction, actual fees much are lower.
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
}
