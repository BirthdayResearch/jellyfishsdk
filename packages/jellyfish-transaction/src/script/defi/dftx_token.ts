import BigNumber from 'bignumber.js'
import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

/**
 * TokenMint DeFi Transaction
 */
export interface TokenMint {
  tokenId: number // -------------------| VarUInt{1-9 bytes}
  amount: BigNumber // -----------------| 8 bytes
}

/**
 * Composable TokenMint, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CTokenMint extends ComposableBuffer<TokenMint> {
  static OP_CODE = 0x4d // 'M'
  static OP_NAME = 'DEFI_OP_MINT_TOKEN'

  composers (tm: TokenMint): BufferComposer[] {
    return [
      ComposableBuffer.varUInt(() => tm.tokenId, v => tm.tokenId = v),
      ComposableBuffer.satoshiAsBigNumber(() => tm.amount, v => tm.amount = v)
    ]
  }
}
