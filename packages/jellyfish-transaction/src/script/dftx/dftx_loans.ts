import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

export interface CreateLoanScheme {
  mincolratio: number
  interestrate: number
  id: string
}

export class CCreateLoanScheme extends ComposableBuffer<CreateLoanScheme> {
  static OP_CODE = 0x10
  static OP_NAME = 'OP_DEFI_TX_CREATE_LOAN_SCHEME'

  composers (cls: CreateLoanScheme): BufferComposer[] {
    return [
      ComposableBuffer.uInt8(() => cls.mincolratio, v => cls.mincolratio = v),
      ComposableBuffer.uInt8(() => cls.interestrate, v => cls.interestrate = v),
      ComposableBuffer.varUIntUtf8BE(() => cls.id, v => cls.id = v)
    ]
  }
}
