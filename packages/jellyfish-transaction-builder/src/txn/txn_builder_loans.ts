import {
  OP_CODES, Script, TransactionSegWit,
  UpdateLoanScheme
} from '@defichain/jellyfish-transaction'
import { P2WPKHTxnBuilder } from './txn_builder'
import BigNumber from 'bignumber.js'

export class TxnBuilderLoans extends P2WPKHTxnBuilder {
  /**
   * Update a loan scheme. Currently requires Foundation Authorization.
   *
   * @param {UpdateLoanScheme} updateLoanScheme txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async updateLoanScheme (updateLoanScheme: UpdateLoanScheme, changeScript: Script): Promise<TransactionSegWit> {
    // NOTE(jingyi2811): By default, update is set to ffffffffffffffff which is 18446744073709551615 until it is overriden.
    updateLoanScheme.update = updateLoanScheme.update ?? new BigNumber('0xffffffffffffffff')
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_UPDATE_LOAN_SCHEME(updateLoanScheme),
      changeScript
    )
  }
}
