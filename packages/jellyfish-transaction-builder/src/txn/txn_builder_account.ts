import BigNumber from 'bignumber.js'
import { DeFiTransactionConstants, OP_CODES, Script, Transaction, TransactionSegWit, Vout } from '@defichain/jellyfish-transaction'
import { UtxosToAccount } from '@defichain/jellyfish-transaction/dist/script/defi/dftx_account'
import { P2WPKHTxnBuilder } from './txn_builder'
import { TxnBuilderError, TxnBuilderErrorType } from './txn_builder_error'

export class TxnBuilderAccount extends P2WPKHTxnBuilder {
  /**
   * Requires at least 0.001 DFI to create transaction, actual fees are much lower.
   *
   * @param {BigNumber} amount amount of utxo to be converted
   * @param {Script} toScript to hold converted token and to send unspent to after deducting the (converted + fees)
   */
  async utxosToAccount (amount: BigNumber, toScript: Script): Promise<TransactionSegWit>
  /**
   * Requires at least 0.001 DFI to create transaction, actual fees are much lower.
   *
   * @param {UtxosToAccount} utxosToAccount txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   */
  async utxosToAccount (utxosToAccount: UtxosToAccount, changeScript: Script): Promise<TransactionSegWit>
  async utxosToAccount (arg: BigNumber | UtxosToAccount, toScript: Script): Promise<TransactionSegWit> {
    let utxosToAccount: UtxosToAccount

    if (BigNumber.isBigNumber(arg)) {
      utxosToAccount = {
        to: [{
          balances: [{
            token: 0x00,
            amount: arg
          }],
          script: toScript
        }]
      }
    } else {
      utxosToAccount = arg

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
    }

    const dfTx = OP_CODES.DEFI_OP_UTXOS_TO_ACCOUNT(utxosToAccount)
    const amountToConvert = utxosToAccount.to[0].balances[0].amount
    const min = amountToConvert.plus(0.001)

    const { prevouts, vin, total } = await this.collectPrevouts(min)

    const deFiOut: Vout = {
      value: new BigNumber(0),
      script: {
        stack: [OP_CODES.OP_RETURN, dfTx]
      },
      tokenId: 0
    }

    const change: Vout = {
      value: total,
      script: toScript,
      tokenId: 0x00
    }

    const txn: Transaction = {
      version: DeFiTransactionConstants.Version,
      vin: vin,
      vout: [deFiOut, change],
      lockTime: 0x00000000
    }

    const fee = await this.calculateFee(txn)
    change.value = total.minus(amountToConvert).minus(fee)

    return await this.sign(txn, prevouts)
  }
}
