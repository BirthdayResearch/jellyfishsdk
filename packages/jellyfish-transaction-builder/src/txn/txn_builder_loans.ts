import {
  OP_CODES, Script, TransactionSegWit,
  SetLoanToken
} from '@defichain/jellyfish-transaction'
import { P2WPKHTxnBuilder } from './txn_builder'

export class TxnBuilderLoans extends P2WPKHTxnBuilder {
  async setLoanToken (setLoanToken: SetLoanToken, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_SET_LOAN_TOKEN(setLoanToken),
      changeScript
    )
  }
}
