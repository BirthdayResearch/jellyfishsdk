import BigNumber from 'bignumber.js'
import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'
import { Script } from '../../tx'
import { CScript } from '../../tx_composer'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

export interface GovernanceKV {
  key: string // -----------------------| 4 bytes unsigned
  value: BigNumber // ------------------| 8 bytes unsigned
}

export interface SetGovernance {
  token: number // ---------------------| 4 bytes unsigned
  amount: BigNumber // -----------------| 8 bytes unsigned
}

/**
 * Composable TokenBalance, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CSetGovernance extends ComposableBuffer<SetGovernance> {
  composers (sg: SetGovernance): BufferComposer[] {
    return [
      ComposableBuffer.uInt32(() => tb.token, v => tb.token = v),
      ComposableBuffer.satoshiAsBigNumber(() => tb.amount, v => tb.amount = v)
    ]
  }
}
