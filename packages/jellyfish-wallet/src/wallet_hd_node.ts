import { Transaction, TransactionSegWit, Vout } from '@defichain/jellyfish-transaction'
import { EllipticPair } from '@defichain/jellyfish-crypto'

/**
 * WalletHdNode extends EllipticPair with additional interface to sign transaction.
 *
 * WalletHdNode uses a managed wallet design where defaults are decided by the implementation.
 * Keeping the WalletHdNode to conventional defaults and options to none.
 */
export interface WalletHdNode extends EllipticPair {

  /**
   * WalletHdNode transaction signing.
   *
   * @param {Transaction} transaction to sign
   * @param {Vout[]} prevouts of the transaction to fund this transaction
   * @return {TransactionSegWit} a signed transaction
   */
  signTx: (transaction: Transaction, prevouts: Vout[]) => Promise<TransactionSegWit>

}

/**
 * WalletHdNode uses the provider model to allow jellyfish-wallet to derive/provide a WalletHdNode from any sources.
 * This design keep WalletHdNode derivation agnostic of any implementation, allowing a lite
 * implementation where WalletHdNode are derived on demand.
 */
export interface WalletHdNodeProvider<T extends WalletHdNode> {
  drive: (path: string) => Promise<T>
}
