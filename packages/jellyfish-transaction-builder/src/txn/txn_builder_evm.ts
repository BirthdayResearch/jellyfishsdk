import {
  OP_CODES, Script, TransactionSegWit, EvmTx
} from '@defichain/jellyfish-transaction'
import { P2WPKHTxnBuilder } from './txn_builder'

export class TxnBuilderEVM extends P2WPKHTxnBuilder {
  /**
  * Create EVM transaction
  * @param {EvmTx} evmTx txn to create
  * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
  * @returns {Promise<TransactionSegWit>}
  */
  async evmTx (evmTx: EvmTx, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_EVM_TX(evmTx),
      changeScript
    )
  }
}
