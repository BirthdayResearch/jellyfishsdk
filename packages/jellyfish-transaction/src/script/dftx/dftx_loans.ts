import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'
import BigNumber from 'bignumber.js'

/* eslint-disable no-return-assign */
export interface SetColleteralToken {
  token: number
  factor: BigNumber
  priceFeedId: string
}

export class CSetColleteralToken extends ComposableBuffer<SetColleteralToken> {
  static OP_CODE = 0x63
  static OP_NAME = 'OP_DEFI_TX_SET_COLLETERAL_TOKEN'

  composers (sct: SetColleteralToken): BufferComposer[] {
    return [
      ComposableBuffer.varUInt(() => sct.token, v => sct.token = v),
      ComposableBuffer.satoshiAsBigNumber(() => sct.factor, v => sct.factor = v),
      ComposableBuffer.hexBEBufferLE(32, () => sct.priceFeedId, v => sct.priceFeedId = v)
    ]
  }
}
