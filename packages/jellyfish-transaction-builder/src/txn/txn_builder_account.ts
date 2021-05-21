import { UtxosToAccount } from '@defichain/jellyfish-transaction/dist/script/defi/dftx_account'
import { OP_CODES, Script, TransactionSegWit } from '@defichain/jellyfish-transaction'
import { P2WPKHTxnBuilder } from './txn_builder'
import { TxnBuilderError, TxnBuilderErrorType } from './txn_builder_error'

export class TxnBuilderAccount extends P2WPKHTxnBuilder {
  /**
   * Requires UTXO in the same amount + fees to create a transaction.
   *
   * @param {UtxosToAccount} utxosToAccount txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @throws {TxnBuilderError} if 'utxosToAccount.to' and 'utxosToAccount.to[0].balances' is not `1`
   * @throws {TxnBuilderError} if 'utxosToAccount.to' and 'utxosToAccount.to[0].balances[0].token' is not `0`
   */
  async utxosToAccount (utxosToAccount: UtxosToAccount, changeScript: Script): Promise<TransactionSegWit> {
    if (utxosToAccount.to.length !== 1) {
      throw new TxnBuilderError(TxnBuilderErrorType.INVALID_UTXOS_TO_ACCOUNT_OUTPUT,
        'Conversion output `utxosToAccount.to` array length must be one'
      )
    }

    if (utxosToAccount.to[0].balances.length !== 1) {
      throw new TxnBuilderError(TxnBuilderErrorType.INVALID_UTXOS_TO_ACCOUNT_OUTPUT,
        'Conversion output `utxosToAccount.to[0].balances` array length must be one'
      )
    }

    if (utxosToAccount.to[0].balances[0].token !== 0x00) {
      throw new TxnBuilderError(TxnBuilderErrorType.INVALID_UTXOS_TO_ACCOUNT_OUTPUT,
        '`utxosToAccount.to[0].balances[0].token` must be 0x00, only DFI support'
      )
    }

    const amountToConvert = utxosToAccount.to[0].balances[0].amount
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_UTXOS_TO_ACCOUNT(utxosToAccount),
      changeScript,
      amountToConvert
    )
  }
}
