import { BigNumber, ApiClient } from '../.'

/**
 * icxrderbook RPCs for DeFi Blockchain
 */
export class ICXOrderBook {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Creates submits an ICX order creation transaction and returns a transaction id.
   *
   * @param {Order} order
   * @param {string} [order.tokenFrom]              Symbol or id of selling token
   * @param {string} [order.chainFrom]              Symbol or id of selling chain
   * @param {string} [order.chainTo]                Symbol or id of buying chain
   * @param {string} [order.tokenTo]                Symbol or id of buying token
   * @param {string} [order.ownerAddress]           Address of DFI token for fees and selling tokens in case of DFC/BTC order type
   * @param {string} [order.receivePubkey]          pubkey which can claim external HTLC in case of EXT/DFC order type
   * @param {BigInt} [order.amountFrom]             tokenFrom coins amount
   * @param {} [order.orderPrice]                   Price per unit
   * @param {BigNumber} [order.orderPrice.integer]  --------------| 8 bytes
   * @param {BigNumber} [order.orderPrice.fraction] --------------| 8 bytes
   * @param {number} [order.expiry]                 Number of blocks until the order expires, default 2880 DFI blocks
   * @return {Promise<string>}                      hex string of the transaction
   */
  async ICXCreateOrder (order: Order, inputUTXOs: InputUTXO[] = []): Promise<string> {
    return await this.client.call(
      'icx_createorder',
      [
        order, inputUTXOs
      ],
      'bignumber'
    )
  }
}

export interface Order {
  tokenFrom?: string // Symbol or id of selling token
  chainFrom?: string // Symbol or id of selling chain
  chainTo?: string // Symbol or id of buying chain
  tokenTo?: string // Symbol or id of buying token
  ownerAddress?: string // Address of DFI token for fees and selling tokens in case of DFC/BTC order type
  receivePubkey: string // pubkey which can claim external HTLC in case of EXT/DFC order type
  // NOTE(surangap): c++ side this as number, but no checks done. should be corrected from c++ side?
  amountFrom: BigNumber // tokenFrom coins amount
  // orderPrice: {           // Price per unit
  //   integer: BigNumber    // --------------| 8 bytes
  //   fraction: BigNumber   // -------------| 8 bytes
  // },
  orderPrice: BigNumber
  expiry?: number // Number of blocks until the order expires, default 2880 DFI blocks
}

export interface InputUTXO {
  txid: string // transaction id
  vout: number // output number
}
