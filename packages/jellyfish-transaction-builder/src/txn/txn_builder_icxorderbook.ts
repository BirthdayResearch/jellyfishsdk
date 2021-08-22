import { OP_CODES, Script, TransactionSegWit, ICXSubmitDFCHTLC, ICXCreateOrder } from '@defichain/jellyfish-transaction'
import { P2WPKHTxnBuilder } from './txn_builder'

export class TxnBuilderICXOrderBook extends P2WPKHTxnBuilder {
  /**
   * ICX Create Order.
   *
   * @param {ICXCreateOrder} createOrder Create order txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async createOrder (createOrder: ICXCreateOrder, changeScript: Script): Promise<TransactionSegWit> {
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_ICX_CREATE_ORDER(createOrder),
     changeScript
    )
  }

  /**
   * Creates submitDFCHTLC transaction.
   *
   * @param {ICXSubmitDFCHTLC} icxSubmitDFCHTLC txn to create
   * @param {Script} changeScript to send unspent to after deducting the (transfer value + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async submitDFCHTLC (icxSubmitDFCHTLC: ICXSubmitDFCHTLC, changeScript: Script): Promise<TransactionSegWit> {
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_ICX_SUBMIT_DFC_HTLC(icxSubmitDFCHTLC),
      changeScript
    )
  }
}
