import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'
import BigNumber from 'bignumber.js'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

/**
 * UpdateLoanScheme DeFi Transaction
 */
export interface UpdateLoanScheme {
  ratio: number // -----------------------| 4 bytes unsigned
  rate: BigNumber // ---------------------| 8 bytes
  identifier: string // ------------------| c = VarUInt{1-9 bytes}, + c bytes UTF encoded string
  update: BigNumber // -------------------| 8 bytes unsigned integer, activation block height. 0 for createLoanScheme, > 0 for updateLoanScheme
}

/**
 * Composable UpdateLoanScheme, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CUpdateLoanScheme extends ComposableBuffer<UpdateLoanScheme> {
  static OP_CODE = 0x4c // 'L'
  static OP_NAME = 'OP_DEFI_TX_UPDATE_LOAN_SCHEME'

  composers (cls: UpdateLoanScheme): BufferComposer[] {
    return [
      ComposableBuffer.uInt32(() => cls.ratio, v => cls.ratio = v),
      ComposableBuffer.satoshiAsBigNumber(() => cls.rate, v => cls.rate = v),
      ComposableBuffer.varUIntUtf8BE(() => cls.identifier, v => cls.identifier = v),
      ComposableBuffer.bigNumberUInt64(() => cls.update, v => cls.update = v)
    ]
  }
}
