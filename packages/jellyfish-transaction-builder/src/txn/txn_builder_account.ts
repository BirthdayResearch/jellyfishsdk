import BigNumber from 'bignumber.js'
import {
  AccountToAccount, AccountToUtxos, UtxosToAccount, SetFutureSwap,
  DeFiTransactionConstants, OP_CODES, Script, Transaction, TransactionSegWit, Vout, TransferDomain
} from '@defichain/jellyfish-transaction'
import { P2WPKHTxnBuilder } from './txn_builder'
import { TxnBuilderError, TxnBuilderErrorType } from './txn_builder_error'
import { ListUnspentQueryOptions } from '../provider'

export class TxnBuilderAccount extends P2WPKHTxnBuilder {
  /**
   * Requires UTXO in the same amount + fees to create a transaction.
   *
   * @param {UtxosToAccount} utxosToAccount txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @throws {TxnBuilderError} if 'utxosToAccount.to' length is less than `1`
   * @throws {TxnBuilderError} if 'utxosToAccount.to[any].balances' length is not `1`
   * @throws {TxnBuilderError} if 'utxosToAccount.to[any].balances[0].token' is not `0`\
   * @returns {Promise<TransactionSegWit>}
   */
  async utxosToAccount (utxosToAccount: UtxosToAccount, changeScript: Script): Promise<TransactionSegWit> {
    if (utxosToAccount.to.length < 1) {
      throw new TxnBuilderError(TxnBuilderErrorType.INVALID_UTXOS_TO_ACCOUNT_OUTPUT,
        'Conversion output `utxosToAccount.to` array length must be greater than or equal to one'
      )
    }

    for (let i = 0; i < utxosToAccount.to.length; i++) {
      const sb = utxosToAccount.to[i]
      if (sb.balances.length !== 1) {
        throw new TxnBuilderError(TxnBuilderErrorType.INVALID_UTXOS_TO_ACCOUNT_OUTPUT,
          'Each `utxosToAccount.to` array `balances` array length must be one'
        )
      }

      if (sb.balances[0].token !== 0x00) {
        throw new TxnBuilderError(TxnBuilderErrorType.INVALID_UTXOS_TO_ACCOUNT_OUTPUT,
          'Each `utxosToAccount.to` array `balances[0].token` must be 0x00, only DFI supported'
        )
      }
    }

    const amountToConvert = utxosToAccount.to.reduce((total, dest) => (
      total.plus(dest.balances[0].amount)
    ), new BigNumber(0))

    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_UTXOS_TO_ACCOUNT(utxosToAccount),
      changeScript,
      amountToConvert
    )
  }

  /**
   *
   * @param {AccountToUtxos} accountToUtxos txn to create
   * @param {Script} destinationScript vout destination, for both utxos minted and change after deducted fee
   * @throws {TxnBuilderError} if 'accountToUtxos.balances' length is not `1`
   * @throws {TxnBuilderError} if 'accountToUtxos.balances[0].token' is not `0`
   * @throws {TxnBuilderError} if 'accountToUtxos.mintingOutputsStart' is not `2`, vout[0] = DfTx, vout[1] = change, vout[2] = new minted utxos
   * @returns {Promise<TransactionSegWit>}
   */
  async accountToUtxos (accountToUtxos: AccountToUtxos, destinationScript: Script): Promise<TransactionSegWit> {
    if (accountToUtxos.balances.length !== 1) {
      throw new TxnBuilderError(TxnBuilderErrorType.INVALID_ACCOUNT_TO_UTXOS_INPUT,
        'Conversion output `accountToUtxos.balances` array length must be one'
      )
    }

    if (accountToUtxos.balances[0].token !== 0x00) {
      throw new TxnBuilderError(TxnBuilderErrorType.INVALID_ACCOUNT_TO_UTXOS_INPUT,
        '`accountToUtxos.balances[0].token` must be 0x00, only DFI support'
      )
    }

    if (accountToUtxos.mintingOutputsStart !== 2) {
      throw new TxnBuilderError(TxnBuilderErrorType.INVALID_ACCOUNT_TO_UTXOS_INPUT,
        '`accountToUtxos.mintingOutputsStart` must be `2` for simplicity'
      )
    }

    const minFee = new BigNumber(0.001)
    const { prevouts, vin, total } = await this.collectPrevouts(minFee)

    const deFiOut: Vout = {
      value: new BigNumber(0),
      script: {
        stack: [
          OP_CODES.OP_RETURN,
          OP_CODES.OP_DEFI_TX_ACCOUNT_TO_UTXOS(accountToUtxos)
        ]
      },
      tokenId: 0x00
    }

    const out: Vout = {
      value: accountToUtxos.balances[0].amount,
      script: destinationScript,
      tokenId: 0x00
    }

    const change: Vout = {
      value: total,
      script: destinationScript,
      tokenId: 0x00
    }

    const txn: Transaction = {
      version: DeFiTransactionConstants.Version,
      vin: vin,
      vout: [deFiOut, change, out],
      lockTime: 0x00000000
    }

    const fee = await this.calculateFee(txn)
    change.value = total.minus(fee)

    return await this.sign(txn, prevouts)
  }

  async accountToAccount (accountToAccount: AccountToAccount, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_ACCOUNT_TO_ACCOUNT(accountToAccount),
      changeScript
    )
  }

  /**
   * FutureSwap transaction.
   *
   * @param {SetFutureSwap} futureSwap txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */

  async futureSwap (futureSwap: SetFutureSwap, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_FUTURE_SWAP(futureSwap),
      changeScript
    )
  }

  /**
  * TransferDomain transaction.
  *
  * @param {TransferDomain} transferDomain txn to create
  * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
  * @param {ListUnspentOptions} [options]
  * @param {number} [options.minimumAmount] default = 0, minimum value of each UTXO
  * @param {number} [options.maximumAmount] default is 'unlimited', maximum value of each UTXO
  * @param {number} [options.maximumCount] default is 'unlimited', maximum number of UTXOs
  * @param {number} [options.minimumSumAmount] default is 'unlimited', minimum sum value of all UTXOs
  * @param {string} [options.tokenId] default is 'all', filter by token
  * @returns {Promise<TransactionSegWit>}
  */

  async transferDomain (transferDomain: TransferDomain, changeScript: Script, options: ListUnspentQueryOptions = {}): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_TRANSFER_DOMAIN(transferDomain),
      changeScript,
      new BigNumber(0),
      options
    )
  }
}
