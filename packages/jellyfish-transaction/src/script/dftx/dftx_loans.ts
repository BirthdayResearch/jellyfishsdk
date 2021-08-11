import BigNumber from 'bignumber.js'
import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

export interface SetLoanToken {
  symbol: string
  name: string
  priceFeedId: string
  mintable: boolean
  interest: BigNumber
}

export class CSetLoanToken extends ComposableBuffer<SetLoanToken> {
  static OP_CODE = 0x67
  static OP_NAME = 'OP_DEFI_TX_SET_LOAN_TOKEN'

  composers (slt: SetLoanToken): BufferComposer[] {
    return [
      ComposableBuffer.varUIntUtf8BE(() => slt.symbol, v => slt.symbol = v),
      ComposableBuffer.varUIntUtf8BE(() => slt.name, v => slt.name = v),
      ComposableBuffer.hexBEBufferLE(32, () => slt.priceFeedId, v => slt.priceFeedId = v),
      ComposableBuffer.satoshiAsBigNumber(() => slt.interest, v => slt.interest = v),
      ComposableBuffer.uBool32(() => slt.mintable, v => slt.mintable = v)
    ]
  }
}
