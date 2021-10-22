import {
  OP_CODES, Script, TransactionSegWit,
  LoanScheme,
  DestroyLoanScheme,
  SetDefaultLoanScheme,
  SetCollateralToken,
  SetLoanToken,
  UpdateLoanToken,
  CreateVault,
  DepositToVault,
  TakeLoan,
  CloseVault
} from '@defichain/jellyfish-transaction'
import { P2WPKHTxnBuilder } from './txn_builder'
import { BigNumber } from '@defichain/jellyfish-json'

export class TxnBuilderLoans extends P2WPKHTxnBuilder {
  /**
   * Create a loan scheme. Currently requires Foundation Authorization.
   *
   * @param {LoanScheme} createLoanScheme txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async createLoanScheme (createLoanScheme: LoanScheme, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_CREATE_LOAN_SCHEME(createLoanScheme),
      changeScript
    )
  }

  /**
   * Update a loan scheme. Currently requires Foundation Authorization.
   *
   * @param {LoanScheme} updateLoanScheme txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async updateLoanScheme (updateLoanScheme: LoanScheme, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_UPDATE_LOAN_SCHEME(updateLoanScheme),
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
   * Creates vault transaction.
   *
   * @param {CreateVault} createVault txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */

  async createVault (createVault: CreateVault, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_CREATE_VAULT(createVault),
      changeScript,
      new BigNumber(1) // creation fee
    )
  }

  /**
   * Deposit to vault transaction.
   *
   * @param {DepositToVault} depositToVault txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */

  async depositToVault (depositToVault: DepositToVault, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_DEPOSIT_TO_VAULT(depositToVault),
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
   * Close a vault.
   *
   * @param {CloseVault} closeVault txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */

  async closeVault (closeVault: CloseVault, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_CLOSE_VAULT(closeVault),
      changeScript
    )
  }
}
