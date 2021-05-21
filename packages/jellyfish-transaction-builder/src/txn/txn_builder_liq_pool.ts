import { PoolAddLiquidity, PoolRemoveLiquidity } from '@defichain/jellyfish-transaction/dist/script/defi/dftx_pool'
import { OP_CODES, Script, TransactionSegWit } from '@defichain/jellyfish-transaction'
import { P2WPKHTxnBuilder } from './txn_builder'
import { TxnBuilderError, TxnBuilderErrorType } from './txn_builder_error'

export class TxnBuilderLiqPool extends P2WPKHTxnBuilder {
  /**
   * Add to liquidity pool using token balances pair supplied in `addLiquidity`.from[0].balances.
   *
   * @param {PoolAddLiquidity} addLiquidity txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @throws {TxnBuilderError} if 'addLiquidity.from' length is not `1`
   * @throws {TxnBuilderError} if 'addLiquidity.from[0].balances' length is not `2`
   * @returns {Promise<TransactionSegWit>}
   */
  async addLiquidity (addLiquidity: PoolAddLiquidity, changeScript: Script): Promise<TransactionSegWit> {
    if (addLiquidity.from.length !== 1) {
      throw new TxnBuilderError(TxnBuilderErrorType.INVALID_ADD_LIQUIDITY_INPUT,
        '`addLiquidity.from` array length must be ONE'
      )
    }

    if (addLiquidity.from[0].balances.length !== 2) {
      throw new TxnBuilderError(TxnBuilderErrorType.INVALID_ADD_LIQUIDITY_INPUT,
        '`addLiquidity.from[0].balances` array length must be TWO'
      )
    }

    if (addLiquidity.from[0].balances[0].token === addLiquidity.from[0].balances[1].token) {
      throw new TxnBuilderError(TxnBuilderErrorType.INVALID_ADD_LIQUIDITY_INPUT,
        '`addLiquidity.from[0].balances` must consists of TWO different token'
      )
    }

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
