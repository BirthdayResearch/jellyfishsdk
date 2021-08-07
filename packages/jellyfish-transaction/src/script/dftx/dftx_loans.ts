import BigNumber from 'bignumber.js'
import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

export interface CreateLoanScheme {
  minColRatio: number
  interestRate: BigNumber
  id: string
}

export class CCreateLoanScheme extends ComposableBuffer<CreateLoanScheme> {
  static OP_CODE = 0x4c
  static OP_NAME = 'OP_DEFI_TX_CREATE_LOAN_SCHEME'

  composers (cls: CreateLoanScheme): BufferComposer[] {
    return [
      ComposableBuffer.uInt32(() => cls.minColRatio, v => cls.minColRatio = v),
      ComposableBuffer.satoshiAsBigNumber(() => cls.interestRate, v => cls.interestRate = v),
      ComposableBuffer.varUIntUtf8BE(() => cls.id, v => cls.id = v)
    ]
  }
}
