import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'
import { Script } from '@defichain/jellyfish-transaction/tx'
import { CScript } from '@defichain/jellyfish-transaction/tx_composer'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

export interface CreateVault {
  script: Script
  loanSchemeId: string
}

export class CCreateVault extends ComposableBuffer<CreateVault> {
  static OP_CODE = 0x56
  static OP_NAME = 'OP_DEFI_TX_CREATE_VAULT'

  composers (cv: CreateVault): BufferComposer[] {
    return [
      ComposableBuffer.single<Script>(() => cv.script, v => cv.script = v, v => new CScript(v)),
      ComposableBuffer.varUIntUtf8BE(() => cv.loanSchemeId, v => cv.loanSchemeId = v)
    ]
  }
}
