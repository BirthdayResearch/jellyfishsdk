import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

export interface SetDefaultLoanScheme {
  identifier: string
}

export class CSetDefaultLoanScheme extends ComposableBuffer<SetDefaultLoanScheme> {
  static OP_CODE = 0x64
  static OP_NAME = 'OP_DEFI_TX_SET_DEFAULT_LOAN_SCHEME'

  composers (cls: SetDefaultLoanScheme): BufferComposer[] {
    return [
      ComposableBuffer.varUIntUtf8BE(() => cls.identifier, v => cls.identifier = v)
    ]
  }
}
