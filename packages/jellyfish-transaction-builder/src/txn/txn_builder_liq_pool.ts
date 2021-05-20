import { PoolAddLiquidity, PoolRemoveLiquidity } from '@defichain/jellyfish-transaction/dist/script/defi/dftx_pool'
import { OP_CODES, Script, TransactionSegWit } from '@defichain/jellyfish-transaction'
import { P2WPKHTxnBuilder } from './txn_builder'

export class TxnBuilderLiqPool extends P2WPKHTxnBuilder {
  async addLiquidity (addLiquidity: PoolAddLiquidity, changeScript: Script): Promise<TransactionSegWit> {
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_POOL_ADD_LIQUIDITY(addLiquidity),
      changeScript
    )
  }

  async removeLiquidity (removeLiquidity: PoolRemoveLiquidity, changeScript: Script): Promise<TransactionSegWit> {
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_POOL_REMOVE_LIQUIDITY(removeLiquidity),
      changeScript
    )
  }
}
