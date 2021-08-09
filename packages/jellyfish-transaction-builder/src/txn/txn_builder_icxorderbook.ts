import {
  OP_CODES,
  Script,
  TransactionSegWit,
  ICXCreateOrder,
  ICXMakeOffer
} from '@defichain/jellyfish-transaction'
import { P2WPKHTxnBuilder } from './txn_builder'

export class TxnBuilderICX extends P2WPKHTxnBuilder {
  /**
   * ICX Create Order.
   *
   * @param {ICXCreateOrder} createOrder pool token p2pwkh scipt, token id and amount to remove
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
   * ICX Make Offer.
   *
   * @param {ICXMakeOffer} makeOffer txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async makeOffer (makeOffer: ICXMakeOffer, changeScript: Script): Promise<TransactionSegWit> {
    return await this.createDeFiTx(
      OP_CODES.OP_DEFI_TX_ICX_MAKE_OFFER(makeOffer),
      changeScript
    )
  }
}
