import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'
import { TokenBalance, CTokenBalance } from './dftx_balance'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

/**
 * TokenMint DeFi Transaction
 */
export interface TokenMint {
  balances: TokenBalance[] // ----------| c = VarUInt{1-9 bytes}, + c x TokenBalance
}

/**
 * Composable TokenMint, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CTokenMint extends ComposableBuffer<TokenMint> {
  static OP_CODE = 0x4d // 'M'
  static OP_NAME = 'OP_DEFI_TX_TOKEN_MINT'

  composers (tm: TokenMint): BufferComposer[] {
    return [
      ComposableBuffer.varUIntArray(() => tm.balances, v => tm.balances = v, v => new CTokenBalance(v))
    ]
  }
}
