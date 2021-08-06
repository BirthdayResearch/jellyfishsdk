import { BigNumber } from '@defichain/jellyfish-json'
import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

export interface SetColleteralToken {
  token: string
  factor: BigNumber
  priceFeedId: string
}

export class CSetColleteralToken extends ComposableBuffer<SetColleteralToken> {
  static OP_CODE = 0x12
  static OP_NAME = 'OP_DEFI_TX_SET_COLLETERAL_TOKEN'

  composers (sct: SetColleteralToken): BufferComposer[] {
    return [
      ComposableBuffer.varUIntUtf8BE(() => sct.token, v => sct.token = v),
      ComposableBuffer.bigNumberUInt64(() => sct.factor, v => sct.factor = v),
      ComposableBuffer.uInt32(() => sct.priceFeedId, v => sct.priceFeedId = v)
    ]
  }
}
