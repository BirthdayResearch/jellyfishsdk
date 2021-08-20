import { SmartBuffer } from 'smart-buffer'
import { readBigNumberUInt64, writeBigNumberUInt64 } from '../../buffer/buffer_bignumber'
import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'
import BigNumber from 'bignumber.js'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

/**
 * UpdateLoanScheme DeFi Transaction
 */
export interface UpdateLoanScheme {
  ratio: number // -----------------------| 4 bytes unsigned
  rate: BigNumber // ---------------------| 8 bytes unsigned
  identifier: string // ------------------| c = VarUInt{1-9 bytes}, + c bytes UTF encoded string
  update?: BigNumber // ------------------| 8 bytes unsigned integer, activation block height. 0 for createLoanScheme, > 0 for updateLoanScheme
}

/**
 * Composable UpdateLoanScheme, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CUpdateLoanScheme extends ComposableBuffer<UpdateLoanScheme> {
  static OP_CODE = 0x4c // 'L'
  static OP_NAME = 'OP_DEFI_TX_UPDATE_LOAN_SCHEME'

  composers (uls: UpdateLoanScheme): BufferComposer[] {
    return [
      ComposableBuffer.uInt32(() => uls.ratio, v => uls.ratio = v),
      ComposableBuffer.satoshiAsBigNumber(() => uls.rate, v => uls.rate = v),
      ComposableBuffer.varUIntUtf8BE(() => uls.identifier, v => uls.identifier = v),
      {
        fromBuffer: (buffer: SmartBuffer): void => {
          // NOTE(jingyi2811): By default, update is set to ffffffffffffffff which is 18446744073709551615 until it is overriden.
          const num = readBigNumberUInt64(buffer)
          if (num.isLessThan(new BigNumber('18446744073709551615'))) {
            uls.update = num
          }
        },
        toBuffer: (buffer: SmartBuffer): void => {
          writeBigNumberUInt64(uls.update ?? new BigNumber('18446744073709551615'), buffer)
        }
      }
    ]
  }
}
