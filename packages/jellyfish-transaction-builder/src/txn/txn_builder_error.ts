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
  SIGN_TRANSACTION_ERROR
}

/**
 * Error while constructing a transaction.
 */
export class TxnBuilderError extends Error {
  constructor (readonly type: TxnBuilderErrorType, message: string) {
    super(message)
  }
}
