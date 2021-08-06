import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'
import BigNumber from 'bignumber.js'
import { Script } from '../../tx'
import { CScript } from '../../tx_composer'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

export enum ICXOrderType {
  /** type for DFI/BTC orders */
  INTERNAL = 1,
  /** type for BTC/DFI orders */
  EXTERNAL = 2
}

/**
 * ICX CreateOrder DeFi Transaction
 */

export interface ICXCreateOrder {
  orderType: number
  tokenId: number
  ownerAddress: Script
  receivePubkey?: string
  amountFrom: BigNumber
  orderPrice: BigNumber
  expiry: number
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
      ComposableBuffer.satoshiAsBigNumber(() => cco.amountFrom, v => cco.amountFrom = v),
      ComposableBuffer.satoshiAsBigNumber(() => cco.orderPrice, v => cco.orderPrice = v),
      ComposableBuffer.uInt32(() => cco.expiry, v => cco.expiry = v)
    ]
  }
}
