import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'
import BigNumber from 'bignumber.js'
import { Script } from '../../tx'
import { CScript } from '../../tx_composer'

export enum ICXOrderType {
  /** type for DFI/BTC orders */
  INTERNAL = 0x1,
  /** type for BTC/DFI orders */
  EXTERNAL = 0x2
}

/**
 * ICX CreateOrder DeFi Transaction
 */
export interface ICXCreateOrder {
  orderType: number // -------------| 1 byte unsigned, 0x1 (INTERNAL) | 0x2 (EXTERNAL)
  tokenId: number // ---------------| VarUInt{1-9 bytes}
  ownerAddress: Script // ----------| n = VarUInt{1-9 bytes}, + n bytes
  receivePubkey?: string // --------| n = VarUInt{1-9 bytes}, 0x00 (default when undefined) | 0x21 (for COMPRESSED_PUBLIC_KEY_SIZE) | 0x41 (for PUBLIC_KEY_SIZE) + n bytes. See implementation at https://github.com/DeFiCh/ain/blob/ff53dcee23db2ffe0da9b147a0a53956f4e7ee31/src/pubkey.h#L57
  amountFrom: BigNumber // ---------| 8 bytes unsigned
  amountToFill: BigNumber // -------| 8 bytes unsigned
  orderPrice: BigNumber // ---------| 8 bytes unsigned
  expiry: number // ----------------| 4 bytes unsigned
}

/**
 * Composable ICXCreateOrder, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CICXCreateOrder extends ComposableBuffer<ICXCreateOrder> {
  static OP_CODE = 0x31 // '1'
  static OP_NAME = 'OP_DEFI_TX_ICX_CREATE_ORDER'

  composers (cco: ICXCreateOrder): BufferComposer[] {
    return [
      ComposableBuffer.uInt8(() => cco.orderType, v => cco.orderType = v),
      ComposableBuffer.varUInt(() => cco.tokenId, v => cco.tokenId = v),
      ComposableBuffer.single<Script>(() => cco.ownerAddress, v => cco.ownerAddress = v, v => new CScript(v)),
      ComposableBuffer.varUIntOptionalHex(() => cco.receivePubkey, v => cco.receivePubkey = v),
      ComposableBuffer.satoshiAsBigNumber(() => cco.amountFrom, v => cco.amountFrom = v),
      ComposableBuffer.satoshiAsBigNumber(() => cco.amountToFill, v => cco.amountToFill = v),
      ComposableBuffer.satoshiAsBigNumber(() => cco.orderPrice, v => cco.orderPrice = v),
      ComposableBuffer.uInt32(() => cco.expiry, v => cco.expiry = v)
    ]
  }
}

/**
 * ICX MakeOffer DeFi Transaction
 */
export interface ICXMakeOffer {
  orderTx: string // ---------------| 32 bytes, txid for which order is the offer
  amount: BigNumber // -------------| 8 bytes unsigned, amount of asset to swap
  ownerAddress: Script // ----------| n = VarUInt{1-9 bytes}, + n bytes, address for DFI token for fees, and in case of BTC/DFC order for DFC asset
  receivePubkey?: string // --------| n = VarUInt{1-9 bytes}, 0x00 (default when undefined) | 0x21 (for COMPRESSED_PUBLIC_KEY_SIZE) | 0x41 (for PUBLIC_KEY_SIZE) + n bytes. See implementation at https://github.com/DeFiCh/ain/blob/ff53dcee23db2ffe0da9b147a0a53956f4e7ee31/src/pubkey.h#L57, address or BTC pubkey in case of DFC/BTC order
  expiry: number // ----------------| 4 bytes unsigned, when the offer exipres in number of blocks
  takerFee: BigNumber // -----------| 8 bytes unsigned
}

/**
 * Composable ICXMakeOffer, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CICXMakeOffer extends ComposableBuffer<ICXMakeOffer> {
  static OP_CODE = 0x32 // '2'
  static OP_NAME = 'OP_DEFI_TX_ICX_MAKE_OFFER'

  composers (cmo: ICXMakeOffer): BufferComposer[] {
    return [
      ComposableBuffer.hexBEBufferLE(32, () => cmo.orderTx, v => cmo.orderTx = v),
      ComposableBuffer.satoshiAsBigNumber(() => cmo.amount, v => cmo.amount = v),
      ComposableBuffer.single<Script>(() => cmo.ownerAddress, v => cmo.ownerAddress = v, v => new CScript(v)),
      ComposableBuffer.varUIntOptionalHex(() => cmo.receivePubkey, v => cmo.receivePubkey = v),
      ComposableBuffer.uInt32(() => cmo.expiry, v => cmo.expiry = v),
      ComposableBuffer.satoshiAsBigNumber(() => cmo.takerFee, v => cmo.takerFee = v)
    ]
  }
}

/**
 * ICXCloseOrder DeFi Transaction
 */
export interface ICXCloseOrder {
  orderTx: string // --------| 32 bytes, txid of order which will be closed
}

/**
 * Composable ICXCloseOrder, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CICXCloseOrder extends ComposableBuffer<ICXCloseOrder> {
  static OP_CODE = 0x36 // '6'
  static OP_NAME = 'OP_DEFI_TX_ICX_CLOSE_ORDER'

  composers (co: ICXCloseOrder): BufferComposer[] {
    return [
      ComposableBuffer.hexBEBufferLE(32, () => co.orderTx, v => co.orderTx = v)
    ]
  }
}

/**
 * ICXSubmitDFCHTLC DeFi transaction
 */
export interface ICXSubmitDFCHTLC {
  offerTx: string // ----| 32 bytes, txid for which offer is this HTLC
  amount: BigNumber // --| 8 bytes, amount that is put in HTLC
  hash: string // -------| 32 bytes, hash for the hash lock part
  timeout: number // ----| 4 bytes, timeout (absolute in blocks) for timelock part
}

/**
 * Composable ICXSubmitDFCHTLC, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CICXSubmitDFCHTLC extends ComposableBuffer<ICXSubmitDFCHTLC> {
  static OP_CODE = 0x33 // '3'
  static OP_NAME = 'OP_DEFI_TX_ICX_SUBMIT_DFC_HTLC'

  composers (msg: ICXSubmitDFCHTLC): BufferComposer[] {
    return [
      ComposableBuffer.hexBEBufferLE(32, () => msg.offerTx, v => msg.offerTx = v),
      ComposableBuffer.satoshiAsBigNumber(() => msg.amount, v => msg.amount = v),
      ComposableBuffer.hexBEBufferLE(32, () => msg.hash, v => msg.hash = v),
      ComposableBuffer.uInt32(() => msg.timeout, v => msg.timeout = v)
    ]
  }
}

/**
 * ICXSubmitEXTHTLC DeFi transaction
 */
export interface ICXSubmitEXTHTLC {
  offerTx: string // -----------| 32 bytes, txid for which offer is this HTLC
  amount: BigNumber // ---------| 8 bytes, amount that is put in HTLC
  hash: string // --------------| 32 bytes, hash for the hash lock part
  htlcScriptAddress: string // -| n = VarUInt{1-9 bytes}, + n bytes, script address of external htlc
  ownerPubkey: string // -------| n = VarUInt{1-9 bytes}, + n bytes, pubkey of the owner to which the funds are refunded if HTLC timeouts
  timeout: number // -----------| 4 bytes, timeout (absolute in block) for expiration of external htlc in external chain blocks
}

/**
 * Composable ICXSubmitEXTHTLC, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CICXSubmitEXTHTLC extends ComposableBuffer<ICXSubmitEXTHTLC> {
  static OP_CODE = 0x34 // '4'
  static OP_NAME = 'OP_DEFI_TX_ICX_SUBMIT_EXT_HTLC'

  composers (msg: ICXSubmitEXTHTLC): BufferComposer[] {
    return [
      ComposableBuffer.hexBEBufferLE(32, () => msg.offerTx, v => msg.offerTx = v),
      ComposableBuffer.satoshiAsBigNumber(() => msg.amount, v => msg.amount = v),
      ComposableBuffer.hexBEBufferLE(32, () => msg.hash, v => msg.hash = v),
      ComposableBuffer.varUIntUtf8BE(() => msg.htlcScriptAddress, v => msg.htlcScriptAddress = v),
      ComposableBuffer.varUIntHex(() => msg.ownerPubkey, v => msg.ownerPubkey = v),
      ComposableBuffer.uInt32(() => msg.timeout, v => msg.timeout = v)
    ]
  }
}

/**
 * ICXClaimDFCHTLC DeFi transaction
 */
export interface ICXClaimDFCHTLC {
  dfcHTLCTx: string // ----| 32 bytes, txid of dfc htlc tx for which the claim is
  seed: string // ---------| n = VarUInt{1-9 bytes}, + n bytes, secret seed for claiming htlc
}

/**
 * Composable ICXClaimDFCHTLC, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CICXClaimDFCHTLC extends ComposableBuffer<ICXClaimDFCHTLC> {
  static OP_CODE = 0x35
  static OP_NAME = 'OP_DEFI_TX_ICX_CLAIM_DFC_HTLC'

  composers (msg: ICXClaimDFCHTLC): BufferComposer[] {
    return [
      ComposableBuffer.hexBEBufferLE(32, () => msg.dfcHTLCTx, v => msg.dfcHTLCTx = v),
      ComposableBuffer.varUIntHex(() => msg.seed, v => msg.seed = v)
    ]
  }
}
