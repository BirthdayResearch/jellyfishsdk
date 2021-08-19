import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'
import BigNumber from 'bignumber.js'
import { Script } from '../../tx'
import { CScript } from '../../tx_composer'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

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
      ComposableBuffer.optionalVarUIntHex(() => cco.receivePubkey, v => cco.receivePubkey = v),
      ComposableBuffer.satoshiAsBigNumber(() => cco.amountFrom, v => cco.amountFrom = v),
      ComposableBuffer.satoshiAsBigNumber(() => cco.amountFrom, v => cco.amountFrom = v), // Represents amountToFill: how much is left to fill the order. In case of createOrder, amountToFill is always equal to amountFrom. See https://github.com/DeFiCh/ain/blob/ff53dcee23db2ffe0da9b147a0a53956f4e7ee31/src/masternodes/icxorder.h#L32
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
  receivePubkey?: string // --------| n = VarUInt{1-9 bytes}, 0x00 (default when undefined) | 0x21 (for COMPRESSED_PUBLIC_KEY_SIZE) | 0x41 (for PUBLIC_KEY_SIZE) + n bytes, address or BTC pubkey in case of DFC/BTC order
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
      ComposableBuffer.optionalVarUIntHex(() => cmo.receivePubkey, v => cmo.receivePubkey = v),
      ComposableBuffer.uInt32(() => cmo.expiry, v => cmo.expiry = v),
      ComposableBuffer.satoshiAsBigNumber(() => cmo.takerFee, v => cmo.takerFee = v)
    ]
  }
}
