import { OP_CODES, Script, TransactionSegWit, ICXSubmitDFCHTLC, ICXCreateOrder } from '@defichain/jellyfish-transaction'
import { P2WPKHTxnBuilder } from './txn_builder'
import { TxnBuilderError, TxnBuilderErrorType } from './txn_builder_error'

export class TxnBuilderICXOrderBook extends P2WPKHTxnBuilder {
  /**
   * ICX Create Order.
   *
   * @param {ICXCreateOrder} createOrder Create order txn to create
   * @param {Script} changeScript to send unspent to after deducting the (converted + fees)
   * @returns {Promise<TransactionSegWit>}
   */
  async createOrder (createOrder: ICXCreateOrder, changeScript: Script): Promise<TransactionSegWit> {
    if (createOrder.receivePubkey !== undefined) {
      const bufferLen = Buffer.from(createOrder.receivePubkey, 'hex').length
      if (bufferLen !== 33 && bufferLen !== 65) {
        throw new TxnBuilderError(TxnBuilderErrorType.INVALID_PUB_KEY_LENGTH,
          'Create order receivePubkey buffer length should be 33 (COMPRESSED_PUBLIC_KEY_SIZE) or 65 (PUBLIC_KEY_SIZE)'
        )
      }
    }
    if (!createOrder.amountToFill.isEqualTo(createOrder.amountFrom)) {
      throw new TxnBuilderError(TxnBuilderErrorType.INVALID_ICX_CREATE_ORDER_AMOUNT_TO_FILL,
        'Create order amountToFill should always equal amountFrom'
      )
    }

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
