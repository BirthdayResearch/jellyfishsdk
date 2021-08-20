import { SmartBuffer } from 'smart-buffer'
import { readBigNumberUInt64, writeBigNumberUInt64 } from '../../buffer/buffer_bignumber'
import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'
import BigNumber from 'bignumber.js'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

/**
 * DestroyLoanScheme DeFi Transaction
 */
export interface DestroyLoanScheme {
  identifier: string // ------------------| c = VarUInt{1-9 bytes}, + c bytes UTF encoded string
  height?: BigNumber // ------------------| 8 bytes unsigned integer
}

/**
 * Composable DestroyLoanScheme, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CDestroyLoanScheme extends ComposableBuffer<DestroyLoanScheme> {
  static OP_CODE = 0x44 // 'D'
  static OP_NAME = 'OP_DEFI_TX_DESTROY_LOAN_SCHEME'

  composers (dls: DestroyLoanScheme): BufferComposer[] {
    return [
      ComposableBuffer.varUIntUtf8BE(() => dls.identifier, v => dls.identifier = v),
      {
        fromBuffer: (buffer: SmartBuffer): void => {
          const num = readBigNumberUInt64(buffer)
          if (num.isGreaterThan(0)) {
            dls.height = num
          }
        },
        toBuffer: (buffer: SmartBuffer): void => {
          writeBigNumberUInt64(dls.height ?? new BigNumber(0), buffer)
        }
      }
    ]
  }
}
