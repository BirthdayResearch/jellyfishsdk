import {
  OP_CODES, Script, TransactionSegWit, EvmTx
} from '@defichain/jellyfish-transaction'
import { P2WPKHTxnBuilder } from './txn_builder'

export class TxnBuilderTokens extends P2WPKHTxnBuilder {
  /**
  * Get EVM TX
  */
  async getEvmTx (evmTx: EvmTx, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_EVM_TX(evmTx),
      changeScript
    )
  }
}
