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
   * Create and submits an ICX order creation transaction.
   *
   * @param {Order} order
   * @param {string} [order.tokenFrom]              Symbol or id of selling token
   * @param {string} [order.chainFrom]              Symbol or id of selling chain
   * @param {string} [order.chainTo]                Symbol or id of buying chain
   * @param {string} [order.tokenTo]                Symbol or id of buying token
   * @param {string} [order.ownerAddress]           Address of DFI token for fees and selling tokens in case of DFC/BTC order type
   * @param {string} [order.receivePubkey]          pubkey which can claim external HTLC in case of EXT/DFC order type
   * @param {BigNumber} [order.amountFrom]          tokenFrom coins amount
   * @param {BigNumber} [order.orderPrice]          Price per unit
   * @param {number} [order.expiry]                 Number of blocks until the order expires, default 2880 DFI blocks
   * @param {InputUTXO[]} inputUTXOs                Specific utxos to spend
   * @param {string} [inputUTXOs.txid]              transaction Id
   * @param {number} [inputUTXOs.vout]              The output number
   * @return {Promise<ICXGenericResult>}            Object indluding transaction id of the the result transaction
   */
  async ICXCreateOrder (order: Order, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult> {
    return await this.client.call(
      'icx_createorder',
      [
        order, inputUTXOs
      ],
      'bignumber'
    )
  }

  /**
   * Create and submits a makeoffer transaction.
   *
   * @param {Offer} offer
   * @param {string} [offer.orderTx]                Transaction id of the order tx for which is the offer
   * @param {BigInt} [offer.amountFrom]             Amount fulfilling the order
   * @param {string} [offer.ownerAddress]           Address of DFI token and for receiving tokens in case of EXT/DFC order
   * @param {string} [offer.receivePubkey]          Pubkey which can claim external HTLC in case of EXT/DFC order type
   * @param {number} [order.expiry]                 Number of blocks until the offer expires, default 10 DFI blocks
   * @param {InputUTXO[]} inputUTXOs                Specific utxos to spend
   * @param {string} [inputUTXOs.txid]              transaction Id
   * @param {number} [inputUTXOs.vout]              The output number
   * @return {Promise<ICXGenericResult>}            Object indluding transaction id of the the transaction
   */
  async ICXMakeOffer (offer: Offer, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult> {
    return await this.client.call(
      'icx_makeoffer',
      [
        offer, inputUTXOs
      ],
      'bignumber'
    )
  }

  /**
   * Closes offer transaction.
   *
   * @param {string} offerTx                        Transaction Id of maker offer
   * @param {InputUTXO[]} inputUTXOs                Specific utxos to spend
   * @param {string} [inputUTXOs.txid]              transaction Id
   * @param {number} [inputUTXOs.vout]              The output number
   * @return {Promise<ICXGenericResult>}            Object indluding transaction id of the the transaction
   */
  async ICXCloseOffer (offerTx: string, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult> {
    return await this.client.call(
      'icx_closeoffer',
      [
        offerTx, inputUTXOs
      ],
      'bignumber'
    )
  }

  /**
   * Create and submits a DFC HTLC transaction
   *
   * @param {HTLC} htlc
   * @param {string} [htlc.offerTx]                 Transaction Id of the offer transaction for which the HTLC is
   * @param {BigInt} [htlc.amount]                  Amount in HTLC
   * @param {string} [htlc.hash]                    Hash of seed used for the hash lock part
   * @param {number} [htlc.timeout]                 Timeout (absolute in blocks) for expiration of HTLC in DFI blocks
   * @param {InputUTXO[]} inputUTXOs                Specific utxos to spend
   * @param {string} [inputUTXOs.txid]              transaction Id
   * @param {number} [inputUTXOs.vout]              The output number
   * @return {Promise<ICXGenericResult>}            Object indluding transaction id of the the transaction
   */
  async ICXSubmitDFCHTLC (htlc: HTLC, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult> {
    return await this.client.call(
      'icx_submitdfchtlc',
      [
        htlc, inputUTXOs
      ],
      'bignumber'
    )
  }

  /**
   * Create and submits a external(EXT) HTLC transaction
   *
   * @param {ExtHTLC} htlc
   * @param {string} [htlc.offerTx]                 Transaction Id of the offer transaction for which the HTLC is
   * @param {BigInt} [htlc.amount]                  Amount in HTLC
   * @param {string} [htlc.htlcScriptAddress]       Script address of external HTLC
   * @param {string} [htlc.hash]                    Hash of seed used for the hash lock part
   * @param {string} [htlc.ownerPubkey]             Pubkey of the owner to which the funds are refunded if HTLC timeouts
   * @param {number} [htlc.timeout]                 Timeout (absolute in blocks) for expiration of HTLC in DFI blocks
   * @param {InputUTXO[]} inputUTXOs                Specific utxos to spend
   * @param {string} [inputUTXOs.txid]              transaction Id
   * @param {number} [inputUTXOs.vout]              The output number
   * @return {Promise<ICXGenericResult>}            Object indluding transaction id of the the transaction
   */
  async ICXSubmitExtHTLC (htlc: ExtHTLC, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult> {
    return await this.client.call(
      'icx_submitexthtlc',
      [
        htlc, inputUTXOs
      ],
      'bignumber'
    )
  }

  /**
   * Claims a DFC HTLC
   *
   * @param {string} [DFCHTLCTx]                    Transaction id of DFC HTLC transaction for which the claim is
   * @param {string} [seed]                         Secret seed for claiming HTLC
   * @param {InputUTXO[]} inputUTXOs                Specific utxos to spend
   * @param {string} [inputUTXOs.txid]              transaction Id
   * @param {number} [inputUTXOs.vout]              The output number
   * @return {Promise<ICXGenericResult>}            Object indluding transaction id of the the transaction
   */
  async ICXClaimDFCHTLC (DFCHTLCTx: string, seed: string, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult> {
    const htlc = {
      dfchtlcTx: DFCHTLCTx,
      seed: seed
    }
    return await this.client.call(
      'icx_claimdfchtlc',
      [
        htlc, inputUTXOs
      ],
      'bignumber'
    )
  }

  /**
   * Closes ICX order
   *
   * @param {string} [orderTx]                      Transaction id of maker order
   * @param {InputUTXO[]} inputUTXOs                Specific utxos to spend
   * @param {string} [inputUTXOs.txid]              transaction Id
   * @param {number} [inputUTXOs.vout]              The output number
   * @return {Promise<ICXGenericResult>}            Object indluding transaction id of the the transaction
   */
  async ICXCloseOrder (orderTx: string, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult> {
    return await this.client.call(
      'icx_closeorder',
      [
        orderTx, inputUTXOs
      ],
      'bignumber'
    )
  }

  /**
   * Returns information about order or fillorder
   *
   * @param {string} [orderTx]                                              Transaction id of createorder or fulfillorder transaction
   * @return {Promise<Record<string, ICXOrderInfo| ICXMakeOfferInfo>>}    Object indluding details of the transaction.
   */
  async ICXGetOrder (orderTx: string): Promise<Record<string, ICXOrderInfo| ICXMakeOfferInfo>> {
    return await this.client.call(
      'icx_getorder',
      [
        orderTx
      ],
      'bignumber'
    )
  }

  /**
   * Returns information about orders or fillorders based on ICXListOrderOptions passed
   *
   * @param {ICXListOrderOptions} options
   * @param {string}  [options.token]                      Token asset
   * @param {string}  [options.chain]                      Chain asset
   * @param {string}  [options.orderTx]                    Order txid to list all offers for this order
   * @param {number}  [options.limit]                      Maximum number of orders to return (default: 50)
   * @param {boolean} [options.closed]                     Display closed orders (default: false)
   * @return {Promise<Record<string, ICXOrderInfo | ICXMakeOfferInfo>>}    Object indluding details of the transaction.
   */
  async ICXListOrders (options: ICXListOrderOptions = {}): Promise<Record<string, ICXOrderInfo | ICXMakeOfferInfo>> {
    return await this.client.call(
      'icx_listorders',
      [
        options
      ],
      'bignumber'
    )
  }

  /**
   * Returns information about HTLCs based on ICXListHTLCOptions passed
   *
   * @param {ICXListHTLCOptions} options
   * @param {string} [options.offerTx]                     Offer txid  for which to list all HTLCS
   * @param {number} [options.limit]                       Maximum number of orders to return (default: 20)
   * @param {boolean} [options.refunded]                   Display refunded HTLC (default: false)
   * @param {boolean} [options.closed]                     Display claimed HTLCs (default: false)
   * @return {Promise<Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo>>}    Object indluding details of the HTLCS.
   */
  async ICXListHTLCs (options: ICXListHTLCOptions = {}): Promise<Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo>> {
    return await this.client.call(
      'icx_listhtlcs',
      [
        options
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
  receivePubkey?: string // pubkey which can claim external HTLC in case of EXT/DFC order type
  // NOTE(surangap): c++ side this as number, but no type checks done. should be corrected from c++ side?
  amountFrom: BigNumber // tokenFrom coins amount
  orderPrice: BigNumber // Price per unit
  expiry?: number // Number of blocks until the order expires, default 2880 DFI blocks
}

export interface InputUTXO {
  txid: string // transaction id
  vout: number // output number
}

export interface ICXGenericResult {
  WARNING: string // Experimental warning notice
  txid: string // Transaction id of the transaction.
}

export interface Offer {
  orderTx: string // Transaction id of the order tx for which is the offer
  amount: BigNumber // Amount fulfilling the order
  ownerAddress: string // Address of DFI token and for receiving tokens in case of EXT/DFC order
  receivePubkey?: string // Pubkey which can claim external HTLC in case of EXT/DFC order type
  // NOTE(surangap): c++ side this as number, but no type checks done. should be corrected from c++ side?
  expiry?: number // Number of blocks until the offer expires, default 10 DFI blocks
}

export interface HTLC {
  offerTx: string // Transaction Id of the offer transaction for which the HTLC is
  amount: BigNumber // Amount in HTLC
  hash: string // Hash of seed used for the hash lock part
  timeout?: number // Timeout (absolute in blocks) for expiration of HTLC in DFI blocks
}

export interface ExtHTLC {
  offerTx: string // Transaction Id of the offer transaction for which the HTLC is
  amount: BigNumber // Amount in HTLC
  htlcScriptAddress: string // Script address of external HTLC
  hash: string // Hash of seed used for the hash lock part
  ownerPubkey: string // Pubkey of the owner to which the funds are refunded if HTLC timeouts
  timeout: number // Timeout (absolute in blocks) for expiration of HTLC in DFI blocks
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

export enum ICXHTLCType {
  CLAIM_DFC = 'CLAIM DFC',
  DFC = 'DFC',
  EXTERNAL = 'EXTERNAL'
}

export enum ICXHTLCStatus {
  OPEN = 'OPEN',
  CLAIMED = 'CLAIMED',
  REFUNDED = 'REFUNDED',
  EXPIRED = 'EXPIRED'
}

export interface ICXOrderInfo {
  status: ICXOrderStatus // Order status
  type: ICXOrderType // Order type. DFI as [ICXOrderType.INTERNAL]
  tokenFrom: string // Symbol or id of selling token
  chainTo?: string // Symbol or id of buying chain
  receivePubkey?: string // Pubkey which can claim external HTLC in case of EXT/DFC order type
  chainFrom?: string // Symbol or id of selling chain
  tokenTo?: string // Symbol or id of buying token
  ownerAddress: string // Address of DFI token for fees and selling tokens in case of DFC/BTC order type
  amountFrom: BigNumber // tokenFrom coins amount
  amountToFill: BigNumber // Remaining amount to fill
  orderPrice: BigNumber // Price per unit
  amountToFillInToAsset: BigNumber //
  height: number // creation height
  expireHeight: number // Number of blocks until the order expires
  closeHeight?: number // Close height
  expired?: boolean // Expired or not
}

export interface ICXMakeOfferInfo {
  orderTx: string // Transaction id of the order tx for which is the offer
  status: ICXOrderStatus // Offer status
  amount: BigNumber // Amount fulfilling the order
  amountInFromAsset: BigNumber // Amount fulfilling from asset
  ownerAddress: string // Address of DFI token and for receiving tokens in case of EXT/DFC order
  receivePubkey?: string // Pubkey which can claim external HTLC in case of EXT/DFC order type
  takerFee: BigNumber // Taker fee
  expireHeight: number // Expire height
}

export interface ICXListOrderOptions {
  token?: string // Token asset
  chain?: string // Chain asset
  orderTx?: string // Order txid to list all offers for this order
  limit?: number // Maximum number of orders to return (default: 50)
  closed?: boolean // Display closed orders (default: false)
}

export interface ICXListHTLCOptions {
  offerTx?: string // Offer txid  for which to list all HTLCS
  limit?: number // Maximum number of orders to return (default: 20)
  refunded?: boolean // Display refunded HTLC (default: false)
  closed?: boolean // Display claimed HTLCs (default: false) NOTE(surangap): in c++ side desciption this is mentioned as "claimed". should be corrected
}

export interface ICXClaimDFCHTLCInfo {
  type: ICXHTLCType // HTLC type
  dfchtlcTx: string // HTLC Transaction Id
  seed: string // HTLC claim secret
  height: number // HTLC creation height
}

export interface ICXDFCHTLCInfo {
  type: ICXHTLCType // HTLC type
  status: ICXHTLCStatus // Status of the HTLC
  offerTx: string // Offer Transaction Id
  amount: BigNumber // Amount
  amountInEXTAsset: BigNumber // Amount in external asset
  hash: string // Hash of DFCHTLC
  timeout: number // Timeout in blocks
  height: number // HTLC creation height
  refundHeight: number // HTLC refund height
}

export interface ICXEXTHTLCInfo {
  type: ICXHTLCType // HTLC type
  status: ICXHTLCStatus // Status of the HTLC
  offerTx: string // Offer Transaction Id
  amount: BigNumber // Amount
  amountInDFCAsset: BigNumber // Amount in external asset
  hash: string // Hash of EXTHTLC
  htlcScriptAddress: string // HTLC script address
  ownerPubkey: string // Pubkey of the owner to which the funds are refunded if HTLC timeouts
  timeout: number // Timeout in blocks
  height: number // HTLC creation height
}
