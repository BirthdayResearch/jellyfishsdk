export enum TxnBuilderErrorType {
  /**
   * No prevouts available to create a transaction
   */
  NO_PREVOUTS,
  /**
   * Required balance is not enough to create a transaction
   */
  MIN_BALANCE_NOT_ENOUGH,
  /**
   * Current fee is over the fixed MAX_FEE_RATE
   */
  OVER_MAX_FEE_RATE,
  /**
   * Invalid fee rate
   */
  INVALID_FEE_RATE,
  /**
   * Unable to sign transaction due to error in TransactionSigner
   */
  SIGN_TRANSACTION_ERROR,
  /**
   * Invalid conversion output `TokenBalance`, must consist only valid DFI balance
   */
  INVALID_UTXOS_TO_ACCOUNT_OUTPUT,
  /**
   * Invalid input `TokenBalances` array length must be one
   */
  INVALID_ADD_LIQUIDITY_INPUT,
  /**
   * Invalid conversion input `TokenBalances`, must consist only valid DFI balance
   */
  INVALID_ACCOUNT_TO_UTXOS_INPUT,
  /**
   * Invalid `AppointOracle` input
   */
  INVALID_APPOINT_ORACLE_INPUT,
  /**
   * Invalid `UpdateOracle` input
   */
  INVALID_UPDATE_ORACLE_INPUT,
  /**
   * Invalid `CreateVoc` amount, should be 0
   */
  INVALID_VOC_AMOUNT,
  /**
   * Invalid `CreateVoc` address, should be an empty stack
   */
  INVALID_VOC_ADDRESS,
}

/**
 * Error while constructing a transaction.
 */
export class TxnBuilderError extends Error {
  constructor (readonly type: TxnBuilderErrorType, message: string) {
    super(message)
  }
}
