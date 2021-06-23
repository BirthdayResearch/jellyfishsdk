import { BigNumber, ApiClient } from '../.'

/**
 * icxorderbook RPCs for DeFi Blockchain
 */
export class ICXOrderBook {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Create and submits an ICX order creation transaction.
   *
   * @param {ICXOrder} order
   * @param {string} [order.tokenFrom] Symbol or id of selling token
   * @param {string} [order.chainFrom] Symbol or id of selling chain
   * @param {string} [order.chainTo] Symbol or id of buying chain
   * @param {string} [order.tokenTo] Symbol or id of buying token
   * @param {string} [order.ownerAddress] Address of DFI token for fees and selling tokens in case of DFC/BTC order type
   * @param {string} [order.receivePubkey] pubkey which can claim external HTLC in case of EXT/DFC order type
   * @param {BigNumber} [order.amountFrom] tokenFrom coins amount
   * @param {BigNumber} [order.orderPrice] Price per unit
   * @param {number} [order.expiry] Number of blocks until the order expires, default 2880 DFI blocks
   * @param {UTXO[]} inputUTXOs Specific utxos to spend
   * @param {string} [inputUTXOs.txid] transaction Id
   * @param {number} [inputUTXOs.vout] The output number
   * @return {Promise<ICXGenericResult>} Object indluding transaction id of the the result transaction
   */
  async createOrder (order: ICXOrder, inputUTXOs: UTXO[] = []): Promise<ICXGenericResult> {
    return await this.client.call(
      'icx_createorder',
      [
        order, inputUTXOs
      ],
      'bignumber'
    )
  }
}
/** ICX order */
export interface ICXOrder {
  /** Symbol or id of selling token */
  tokenFrom?: string
  /** Symbol or id of selling chain */
  chainFrom?: string
  /** Symbol or id of buying chain */
  chainTo?: string
  /** Symbol or id of buying token */
  tokenTo?: string
  /** Address of DFI token for fees and selling tokens in case of DFC/BTC order type */
  ownerAddress?: string
  // NOTE(surangap): c++ side this as number, but no type checks done. should be corrected from c++ side?
  /** pubkey which can claim external HTLC in case of EXT/DFC order type */
  receivePubkey?: string
  /** tokenFrom coins amount */
  amountFrom: BigNumber
  /** Price per unit */
  orderPrice: BigNumber
  /** Number of blocks until the order expires, default 2880 DFI blocks */
  expiry?: number
}

/** Input UTXO */
export interface UTXO {
  /** transaction id */
  txid: string
  /** output number */
  vout: number
}

/** ICX RPC call Generic result */
export interface ICXGenericResult {
  /** Experimental warning notice */
  WARNING: string
  /** Transaction id of the transaction. */
  txid: string
}

export enum ICXOrderStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  FILLED = 'FILLED',
  EXPIRED = 'EXPIRED'
}

export enum ICXOrderType {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
}

/** ICX order info */
export interface ICXOrderInfo {
  /** Order status */
  status: ICXOrderStatus
  /** Order type. DFI as [ICXOrderType.INTERNAL] */
  type: ICXOrderType
  /** Symbol or id of selling token */
  tokenFrom: string
  /** Symbol or id of buying chain */
  chainTo?: string
  /** Pubkey which can claim external HTLC in case of EXT/DFC order type */
  receivePubkey?: string
  /** Symbol or id of selling chain */
  chainFrom?: string
  /** Symbol or id of buying token */
  tokenTo?: string
  /** Address of DFI token for fees and selling tokens in case of DFC/BTC order type */
  ownerAddress: string
  /** tokenFrom coins amount */
  amountFrom: BigNumber
  /** Remaining amount to fill */
  amountToFill: BigNumber
  /** Price per unit */
  orderPrice: BigNumber
  /** */
  amountToFillInToAsset: BigNumber
  /** creation height */
  height: BigNumber
  /** Number of blocks until the order expires */
  expireHeight: BigNumber
  /** Close height */
  closeHeight?: BigNumber
  /** Expired or not */
  expired?: boolean
}

/** ICX offer info */
export interface ICXOfferInfo {
  /** Transaction id of the order tx for which is the offer */
  orderTx: string
  /** Offer status */
  status: ICXOrderStatus
  /** Amount fulfilling the order */
  amount: BigNumber
  /** Amount fulfilling from asset */
  amountInFromAsset: BigNumber
  /** Address of DFI token and for receiving tokens in case of EXT/DFC order */
  ownerAddress: string
  /** Pubkey which can claim external HTLC in case of EXT/DFC order type */
  receivePubkey?: string
  /** Taker fee */
  takerFee: BigNumber
  /** Expire height */
  expireHeight: BigNumber
}
