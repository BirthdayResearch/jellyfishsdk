import { Transaction, TransactionSegWit, Vout } from '@defichain/jellyfish-transaction'
import { EllipticPair } from '@defichain/jellyfish-crypto'

/**
 * WalletEllipticPair extends EllipticPair with additional interface to sign transaction.
 *
 * WalletEllipticPair uses a managed wallet design where defaults are decided by the implementation.
 * Keeping the WalletEllipticPair to conventional defaults and options to none.
 */
export interface WalletEllipticPair extends EllipticPair {

  /**
   * WalletEllipticPair transaction signing.
   *
   * @param {Transaction} transaction to sign
   * @param {Vout[]} prevouts of the transaction to fund this transaction
   * @return {TransactionSegWit} a signed transaction
   */
  signTx: (transaction: Transaction, prevouts: Vout[]) => Promise<TransactionSegWit>

}
