import { UtxosToAccount } from '@defichain/jellyfish-transaction/dist/script/defi/dftx_account'
import { OP_CODES, Script, TransactionSegWit } from '@defichain/jellyfish-transaction'
import { P2WPKHTxnBuilder } from './txn_builder'
import { TxnBuilderError, TxnBuilderErrorType } from './txn_builder_error'
import BigNumber from 'bignumber.js'

export class TxnBuilderAccount extends P2WPKHTxnBuilder {
  /**
   * Requires at least 0.001 DFI to create transaction, actual fees are much lower.
   *
   * @param {UtxosToAccount} utxosToAccount txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
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

    const amountToConvert = utxosToAccount.to[0].balances[0].amount
    return await super.createDeFiTx(
      // OP_CODES.DEFI_OP_UTXOS_TO_ACCOUNT(utxosToAccount),
      OP_CODES.OP_DEFI_TX_POOL_SWAP({
        fromScript: changeScript,
        fromTokenId: 0,
        fromAmount: new BigNumber('10'),
        toScript: changeScript,
        toTokenId: 1,
        maxPrice: {
          integer: new BigNumber('9223372036854775807'),
          fraction: new BigNumber('9223372036854775807')
        }
      }),
      changeScript,
      amountToConvert
    )
  }
}
