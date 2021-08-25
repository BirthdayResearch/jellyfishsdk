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
 * ICXSubmitDFCHTLC DeFi transaction
 */
export interface ICXSubmitDFCHTLC {
  offerTx: string // ----| 32 byte, txid for which offer is this HTLC
  amount: BigNumber // --| 8 byte, amount that is put in HTLC
  hash: string // -------| 32 byte, hash for the hash lock part
  timeout: number // ----| 4 byte, timeout (absolute in blocks) for timelock part
}

/**
 * Composable ICXSubmitDFCHTLC, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CICXSubmitDFCHTLC extends ComposableBuffer<ICXSubmitDFCHTLC> {
  static OP_CODE = 0x33
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
