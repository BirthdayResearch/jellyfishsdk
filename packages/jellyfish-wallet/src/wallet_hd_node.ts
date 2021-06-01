import { SmartBuffer } from 'smart-buffer'
import { CTransaction, CTransactionSegWit, Transaction, TransactionSegWit, Vout } from '@defichain/jellyfish-transaction'
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

export interface SigningInterface {
  unsigned: (buffer: Buffer, tx: Transaction) => Promise<void>
  signed: (buffer: Buffer, tx: TransactionSegWit) => Promise<void>
}

/**
 * WalletHdNode uses the provider model to allow jellyfish-wallet to derive/provide a WalletHdNode from any sources.
 * This design keep WalletHdNode derivation agnostic of any implementation, allowing a lite
 * implementation where WalletHdNode are derived on demand.
 */
export abstract class WalletHdNodeProvider<T extends WalletHdNode> {
  signingCb?: SigningInterface
  private walletHdNode?: T

  constructor (signingCb?: SigningInterface) {
    this.signingCb = signingCb
  }

  abstract derive (path: string): T

  /**
   * Derive wallet hd node and store with this provider
   * @param {string} path
   * @returns {T}
   */
  deriveAndAssign (path: string): T {
    this.walletHdNode = this.derive(path)
    return this.walletHdNode
  }

  /**
   * @see WalletHdNode.signTx extended to work with SigningInterface callback
   * @param {Transaction} transaction
   * @param {Vout[]} prevouts
   * @returns {TransactionSegWit}
   */
  async signTx (transaction: Transaction, prevouts: Vout[]): Promise<TransactionSegWit> {
    if (this.walletHdNode === undefined) {
      throw new Error('WalletHdNode is not derived, instantiate one by using via `deriveAndAssign` before calling `WalletHdNodeProvider.signTx`')
    }

    const signed = await this.walletHdNode.signTx(transaction, prevouts)
    if (this.signingCb !== undefined) {
      const unsignedBuffer = new SmartBuffer()
      new CTransaction(transaction).toBuffer(unsignedBuffer)

      const signedBuffer = new SmartBuffer()
      new CTransactionSegWit(signed).toBuffer(signedBuffer)

      await this.signingCb.unsigned(unsignedBuffer.toBuffer(), transaction)
      await this.signingCb.signed(signedBuffer.toBuffer(), signed)
    }
    return signed
  }
}
