import {
  OP_CODES, Script, TransactionSegWit, TokenBurn
} from '@defichain/jellyfish-transaction'
import { P2WPKHTxnBuilder } from './txn_builder'

export class TxnBuilderTokens extends P2WPKHTxnBuilder {
  /**
   * Burn tokens
   *
   * @param {TokenBurn} tokenBurn txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async burnTokens (tokenBurn: TokenBurn, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_TOKEN_BURN(tokenBurn),
      changeScript
    )
  }
}
