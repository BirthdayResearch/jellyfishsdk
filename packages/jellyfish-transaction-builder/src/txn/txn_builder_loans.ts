import {
  OP_CODES, Script, TransactionSegWit,
  SetColleteralToken
} from '@defichain/jellyfish-transaction'
import { P2WPKHTxnBuilder } from './txn_builder'

export class TxnBuilderLoans extends P2WPKHTxnBuilder {
  async setColleteralToken (setColleteralToken: SetColleteralToken, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_SET_COLLETERAL_TOKEN(setColleteralToken),
      changeScript
    )
  }
}
