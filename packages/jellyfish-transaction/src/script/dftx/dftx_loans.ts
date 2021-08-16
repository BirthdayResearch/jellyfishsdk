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

export interface UpdateLoanScheme {
  ratio: number
  rate: BigNumber
  identifier: string
  update: BigNumber
}

export class CUpdateLoanScheme extends ComposableBuffer<UpdateLoanScheme> {
  static OP_CODE = 0x4c
  static OP_NAME = 'OP_DEFI_TX_UPDATE_LOAN_SCHEME'

  composers (uls: UpdateLoanScheme): BufferComposer[] {
    return [
      ComposableBuffer.uInt32(() => uls.ratio, v => uls.ratio = v),
      ComposableBuffer.satoshiAsBigNumber(() => uls.rate, v => uls.rate = v),
      ComposableBuffer.varUIntUtf8BE(() => uls.identifier, v => uls.identifier = v),
      ComposableBuffer.bigNumberUInt64(() => uls.update, v => uls.update = v)
    ]
  }
}
