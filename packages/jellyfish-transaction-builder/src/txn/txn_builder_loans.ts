import {
  OP_CODES, Script, TransactionSegWit,
  SetLoanScheme,
  DestroyLoanScheme,
  SetDefaultLoanScheme,
  SetCollateralToken,
  SetLoanToken,
  UpdateLoanToken,
  TakeLoan,
  PaybackLoan
} from '@defichain/jellyfish-transaction'
import { P2WPKHTxnBuilder } from './txn_builder'

export class TxnBuilderLoans extends P2WPKHTxnBuilder {
  /**
   * Create or update a loan scheme. Currently requires Foundation Authorization.
   *
   * @param {SetLoanScheme} setLoanScheme txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async setLoanScheme (setLoanScheme: SetLoanScheme, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_SET_LOAN_SCHEME(setLoanScheme),
      changeScript
    )
  }

  /**
   * Destroy a loan scheme. Currently requires Foundation Authorization.
   *
   * @param {DestroyLoanScheme} destroyLoanScheme txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async destroyLoanScheme (destroyLoanScheme: DestroyLoanScheme, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_DESTROY_LOAN_SCHEME(destroyLoanScheme),
      changeScript
    )
  }

  /**
   * Set default loan scheme. Currently requires Foundation Authorization.
   *
   * @param {SetDefaultLoanScheme} setDefaultLoanScheme txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async setDefaultLoanScheme (setDefaultLoanScheme: SetDefaultLoanScheme, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_SET_DEFAULT_LOAN_SCHEME(setDefaultLoanScheme),
      changeScript
    )
  }

  /**
   * Set a collateral token. Currently requires Foundation Authorization.
   *
   * @param {SetCollateralToken} setCollateralToken txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async setCollateralToken (setCollateralToken: SetCollateralToken, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_SET_COLLATERAL_TOKEN(setCollateralToken),
      changeScript
    )
  }

  /**
   * Set loan token. Currently requires Foundation Authorization.
   *
   * @param {SetLoanToken} setLoanToken txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async setLoanToken (setLoanToken: SetLoanToken, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_SET_LOAN_TOKEN(setLoanToken),
      changeScript
    )
  }

  /**
   * Update loan token. Currently requires Foundation Authorization.
   *
   * @param {UpdateLoanToken} updateLoanToken txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async updateLoanToken (updateLoanToken: UpdateLoanToken, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_UPDATE_LOAN_TOKEN(updateLoanToken),
      changeScript
    )
  }

  /**
   * Take loan transaction.
   *
   * @param {TakeLoan} takeLoan txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async takeLoan (takeLoan: TakeLoan, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_TAKE_LOAN(takeLoan),
      changeScript
    )
  }

  /**
   * PaybackLoan to vault transaction.
   *
   * @param {PaybackLoan} paybackLoan txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */

  async paybackLoan (paybackLoan: PaybackLoan, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_PAYBACK_LOAN(paybackLoan),
      changeScript
    )
  }
}
