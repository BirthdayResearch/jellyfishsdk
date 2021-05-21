import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'
import { TokenBalance, CTokenBalance } from './dftx_balance'
import BigNumber from 'bignumber.js'

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

/**
 * TokenCreate DeFi Transaction
 */
export interface TokenCreate {
  symbol: string // ---------------------| VarUInt{1-9 bytes}, + n bytes
  name: string // -----------------------| VarUInt{1-9 bytes}, + n bytes
  decimal: number // --------------------| 1 byte
  limit: BigNumber // -------------------| 64 bytes
  flags: number // ----------------------| 1 byte
}

/**
 * Composable TokenMint, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CTokenCreate extends ComposableBuffer<TokenCreate> {
  static OP_CODE = 0x54 /// 'T'
  static OP_NAME = 'DEFI_OP_TOKEN_CREATE'

  composers (tc: TokenCreate): BufferComposer[] {
    return [
      ComposableBuffer.varUIntUtf8BE(() => tc.symbol, v => tc.symbol = v),
      ComposableBuffer.varUIntUtf8BE(() => tc.name, v => tc.name = v),
      ComposableBuffer.uInt8(() => tc.decimal, v => tc.decimal = v),
      ComposableBuffer.bigNumberUInt64(() => tc.limit, v => tc.limit = v),
      ComposableBuffer.uInt8(() => tc.flags, v => tc.flags = v)
    ]
  }
}
