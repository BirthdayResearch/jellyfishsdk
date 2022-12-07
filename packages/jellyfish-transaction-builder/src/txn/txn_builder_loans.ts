import {
  OP_CODES, Script, TransactionSegWit,
  SetLoanScheme,
  DestroyLoanScheme,
  SetDefaultLoanScheme,
  SetCollateralToken,
  SetLoanToken,
  UpdateLoanToken,
  CreateVault,
  UpdateVault,
  DepositToVault,
  WithdrawFromVault,
  CloseVault,
  TakeLoan,
  PaybackLoan,
  PaybackLoanV2,
  PlaceAuctionBid,
  PaybackWithCollateral
} from '@defichain/jellyfish-transaction'
import { P2WPKHTxnBuilder } from './txn_builder'
import { BigNumber } from '@defichain/jellyfish-json'

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
   * Creates vault transaction.
   *
   * @param {CreateVault} createVault txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   * @deprecated vault methods are moving to TxnBuilderVault
   */
  async createVault (createVault: CreateVault, changeScript: Script): Promise<TransactionSegWit> {
    const creationFee = this.network.name === 'mainnet' ? new BigNumber('2') : new BigNumber('1')

    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_CREATE_VAULT(createVault),
      changeScript,
      creationFee
    )
  }

  /**
   * Create update vault transaction.
   *
   * @param {UpdateVault} updateVault txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   * @deprecated vault methods are moving to TxnBuilderVault
   */
  async updateVault (updateVault: UpdateVault, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_UPDATE_VAULT(updateVault),
      changeScript
    )
  }

  /**
   * Deposit to vault transaction.
   *
   * @param {DepositToVault} depositToVault txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   * @deprecated vault methods are moving to TxnBuilderVault
   */
  async depositToVault (depositToVault: DepositToVault, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_DEPOSIT_TO_VAULT(depositToVault),
      changeScript
    )
  }

  /**
   * Withdraw from vault transaction.
   *
   * @param {withdrawFromVault} withdrawFromVault txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   * @deprecated vault methods are moving to TxnBuilderVault
   */
  async withdrawFromVault (withdrawFromVault: WithdrawFromVault, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_WITHDRAW_FROM_VAULT(withdrawFromVault),
      changeScript
    )
  }

  /**
   * Close a vault.
   *
   * @param {CloseVault} closeVault txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   * @deprecated vault methods are moving to TxnBuilderVault
   */
  async closeVault (closeVault: CloseVault, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_CLOSE_VAULT(closeVault),
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

  /**
   * PaybackLoanV2 transaction.
   *
   * @param {PaybackLoanV2} paybackLoanV2 txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async paybackLoanV2 (paybackLoanV2: PaybackLoanV2, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_PAYBACK_LOAN_V2(paybackLoanV2),
      changeScript
    )
  }

  /**
   * placeAuctionBid transaction.
   *
   * @param {PlaceAuctionBid} placeAuctionBid txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   * @deprecated vault methods are moving to TxnBuilderVault
   */
  async placeAuctionBid (placeAuctionBid: PlaceAuctionBid, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_AUCTION_BID(placeAuctionBid),
      changeScript
    )
  }

  /**
   * Return loan with vault's collaterals
   *
   * @param {PaybackWithCollateral} paybackWithCollateral txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async paybackWithCollateral (paybackWithCollateral: PaybackWithCollateral, changeScript: Script): Promise<TransactionSegWit> {
    return await super.createDeFiTx(
      OP_CODES.OP_DEFI_TX_PAYBACK_WITH_COLLATERAL(paybackWithCollateral),
      changeScript
    )
  }
}
