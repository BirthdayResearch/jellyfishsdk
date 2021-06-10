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
   * @param {InputUTXO[]} inputUTXOs Specific utxos to spend
   * @param {string} [inputUTXOs.txid] transaction Id
   * @param {number} [inputUTXOs.vout] The output number
   * @return {Promise<ICXGenericResult>} Object indluding transaction id of the the result transaction
   */
  async createOrder (order: ICXOrder, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult> {
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
   * @param {ICXOffer} offer
   * @param {string} [offer.orderTx] Transaction id of the order tx for which is the offer
   * @param {BigNumber} [offer.amountFrom] Amount fulfilling the order
   * @param {string} [offer.ownerAddress] Address of DFI token and for receiving tokens in case of EXT/DFC order
   * @param {string} [offer.receivePubkey] Pubkey which can claim external HTLC in case of EXT/DFC order type
   * @param {number} [order.expiry] Number of blocks until the offer expires, default 10 DFI blocks
   * @param {InputUTXO[]} inputUTXOs Specific utxos to spend
   * @param {string} [inputUTXOs.txid] transaction Id
   * @param {number} [inputUTXOs.vout] The output number
   * @return {Promise<ICXGenericResult>} Object indluding transaction id of the the transaction
   */
  async makeOffer (offer: ICXOffer, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult> {
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
   * @param {string} offerTx Transaction Id of maker offer
   * @param {InputUTXO[]} inputUTXOs Specific utxos to spend
   * @param {string} [inputUTXOs.txid] transaction Id
   * @param {number} [inputUTXOs.vout] The output number
   * @return {Promise<ICXGenericResult>} Object indluding transaction id of the the transaction
   */
  async closeOffer (offerTx: string, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult> {
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
   * @param {string} [htlc.offerTx] Transaction Id of the offer transaction for which the HTLC is
   * @param {BigNumber} [htlc.amount] Amount in HTLC
   * @param {string} [htlc.hash] Hash of seed used for the hash lock part
   * @param {number} [htlc.timeout] Timeout (absolute in blocks) for expiration of HTLC in DFI blocks
   * @param {InputUTXO[]} inputUTXOs Specific utxos to spend
   * @param {string} [inputUTXOs.txid] transaction Id
   * @param {number} [inputUTXOs.vout] The output number
   * @return {Promise<ICXGenericResult>} Object indluding transaction id of the the transaction
   */
  async submitDFCHTLC (htlc: HTLC, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult> {
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
   * @param {string} [htlc.offerTx] Transaction Id of the offer transaction for which the HTLC is
   * @param {BigNumber} [htlc.amount] Amount in HTLC
   * @param {string} [htlc.htlcScriptAddress] Script address of external HTLC
   * @param {string} [htlc.hash] Hash of seed used for the hash lock part
   * @param {string} [htlc.ownerPubkey] Pubkey of the owner to which the funds are refunded if HTLC timeouts
   * @param {number} [htlc.timeout] Timeout (absolute in blocks) for expiration of HTLC in DFI blocks
   * @param {InputUTXO[]} inputUTXOs Specific utxos to spend
   * @param {string} [inputUTXOs.txid] transaction Id
   * @param {number} [inputUTXOs.vout] The output number
   * @return {Promise<ICXGenericResult>} Object indluding transaction id of the the transaction
   */
  async submitExtHTLC (htlc: ExtHTLC, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult> {
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
   * @param {string} [DFCHTLCTx] Transaction id of DFC HTLC transaction for which the claim is
   * @param {string} [seed] Secret seed for claiming HTLC
   * @param {InputUTXO[]} inputUTXOs Specific utxos to spend
   * @param {string} [inputUTXOs.txid] transaction Id
   * @param {number} [inputUTXOs.vout] The output number
   * @return {Promise<ICXGenericResult>} Object indluding transaction id of the the transaction
   */
  async claimDFCHTLC (DFCHTLCTx: string, seed: string, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult> {
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
   * @param {string} [orderTx] Transaction id of maker order
   * @param {InputUTXO[]} inputUTXOs Specific utxos to spend
   * @param {string} [inputUTXOs.txid] transaction Id
   * @param {number} [inputUTXOs.vout] The output number
   * @return {Promise<ICXGenericResult>} Object indluding transaction id of the the transaction
   */
  async closeOrder (orderTx: string, inputUTXOs: InputUTXO[] = []): Promise<ICXGenericResult> {
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
   * @param {string} [orderTx] Transaction id of createorder or fulfillorder transaction
   * @return {Promise<Record<string, ICXOrderInfo| ICXOfferInfo>>} Object indluding details of the transaction.
   */
  async getOrder (orderTx: string): Promise<Record<string, ICXOrderInfo| ICXOfferInfo>> {
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
   * @param {string}  [options.token] Token asset
   * @param {string}  [options.chain] Chain asset
   * @param {string}  [options.orderTx] Order txid to list all offers for this order
   * @param {number}  [options.limit] Maximum number of orders to return (default: 50)
   * @param {boolean} [options.closed] Display closed orders (default: false)
   * @return {Promise<Record<string, ICXOrderInfo | ICXOfferInfo>>} Object indluding details of the transaction.
   */
  async listOrders (options: ICXListOrderOptions = {}): Promise<Record<string, ICXOrderInfo | ICXOfferInfo>> {
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
   * @param {string} [options.offerTx] Offer txid  for which to list all HTLCS
   * @param {number} [options.limit] Maximum number of orders to return (default: 20)
   * @param {boolean} [options.refunded] Display refunded HTLC (default: false)
   * @param {boolean} [options.closed] Display claimed HTLCs (default: false)
   * @return {Promise<Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo>>} Object indluding details of the HTLCS.
   */
  async listHTLCs (options: ICXListHTLCOptions = {}): Promise<Record<string, ICXDFCHTLCInfo| ICXEXTHTLCInfo| ICXClaimDFCHTLCInfo>> {
    return await this.client.call(
      'icx_listhtlcs',
      [
        options
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
  /** pubkey which can claim external HTLC in case of EXT/DFC order type */
  // NOTE(surangap): c++ side this as number, but no type checks done. should be corrected from c++ side?
  receivePubkey?: string
  /** tokenFrom coins amount */
  amountFrom: BigNumber
  /** Price per unit */
  orderPrice: BigNumber
  /** Number of blocks until the order expires, default 2880 DFI blocks */
  expiry?: number
}

/** Input UTXO */
export interface InputUTXO {
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

/** ICX offer */
export interface ICXOffer {
  /** Transaction id of the order tx for which is the offer */
  orderTx: string
  /** Amount fulfilling the order */
  amount: BigNumber
  /** Address of DFI token and for receiving tokens in case of EXT/DFC order */
  ownerAddress: string
  /** Pubkey which can claim external HTLC in case of EXT/DFC order type */
  // NOTE(surangap): c++ side this as number, but no type checks done. should be corrected from c++ side?
  receivePubkey?: string
  /** Number of blocks until the offer expires, default 10 DFI blocks */
  expiry?: number
}

/** HTLC */
export interface HTLC {
  /** Transaction Id of the offer transaction for which the HTLC is */
  offerTx: string
  /** Amount in HTLC */
  amount: BigNumber
  /** Hash of seed used for the hash lock part */
  hash: string
  /** Timeout (absolute in blocks) for expiration of HTLC in DFI blocks */
  timeout?: number
}

/** External HTLC */
export interface ExtHTLC {
  /** Transaction Id of the offer transaction for which the HTLC is */
  offerTx: string
  /** Amount in HTLC */
  amount: BigNumber
  /** Script address of external HTLC */
  htlcScriptAddress: string
  /** Hash of seed used for the hash lock part */
  hash: string
  /** Pubkey of the owner to which the funds are refunded if HTLC timeouts */
  ownerPubkey: string
  /** Timeout (absolute in blocks) for expiration of HTLC in DFI blocks */
  timeout: number
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
  height: number
  /** Number of blocks until the order expires */
  expireHeight: number
  /** Close height */
  closeHeight?: number
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
  expireHeight: number
}

/** ICX listOrder options */
export interface ICXListOrderOptions {
  /** Token asset */
  token?: string
  /** Chain asset */
  chain?: string
  /** Order txid to list all offers for this order */
  orderTx?: string
  /**  Maximum number of orders to return (default: 50) */
  limit?: number
  /**  Display closed orders (default: false) */
  closed?: boolean
}

/** ICX listHTLC options */
export interface ICXListHTLCOptions {
  /** Offer txid  for which to list all HTLCS */
  offerTx?: string
  /** Maximum number of orders to return (default: 20) */
  limit?: number
  /** Display refunded HTLC (default: false) */
  refunded?: boolean
  /** Display claimed HTLCs (default: false) NOTE(surangap): in c++ side desciption this is mentioned as "claimed". should be corrected */
  closed?: boolean
}

/** ICX claimed DFCHTLC info */
export interface ICXClaimDFCHTLCInfo {
  /** HTLC type */
  type: ICXHTLCType
  /** HTLC Transaction Id */
  dfchtlcTx: string
  /** HTLC claim secret */
  seed: string
  /** HTLC creation height */
  height: number
}

/** ICX DFCHTLC info */
export interface ICXDFCHTLCInfo {
  /** HTLC type */
  type: ICXHTLCType
  /** Status of the HTLC */
  status: ICXHTLCStatus
  /** Offer Transaction Id */
  offerTx: string
  /** Amount */
  amount: BigNumber
  /** Amount in external asset */
  amountInEXTAsset: BigNumber
  /** Hash of DFCHTLC */
  hash: string
  /** Timeout in blocks */
  timeout: number
  /** HTLC creation height */
  height: number
  /** HTLC refund height */
  refundHeight: number
}

/** ICX EXTHTLC info */
export interface ICXEXTHTLCInfo {
  /** HTLC type */
  type: ICXHTLCType
  /** Status of the HTLC */
  status: ICXHTLCStatus
  /** Offer Transaction Id */
  offerTx: string
  /** Amount */
  amount: BigNumber
  /** Amount in external asset */
  amountInDFCAsset: BigNumber
  /** Hash of EXTHTLC */
  hash: string
  /** HTLC script address */
  htlcScriptAddress: string
  /** Pubkey of the owner to which the funds are refunded if HTLC timeouts */
  ownerPubkey: string
  /** Timeout in blocks */
  timeout: number
  /** HTLC creation height */
  height: number
}
