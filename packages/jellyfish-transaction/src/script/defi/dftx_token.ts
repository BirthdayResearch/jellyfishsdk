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
  isDAT: boolean // ---------------------| 1 byte bitmask start, position 0
  tradeable: boolean // -----------------| 1 byte bitmask start, position 1
  mintable: boolean // ------------------| 1 byte bitmask start, position 2
}

/**
 * Composable TokenMint, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CTokenCreate extends ComposableBuffer<TokenCreate> {
  static OP_CODE = 0x54 /// 'T'
  static OP_NAME = 'OP_DEFI_TX_TOKEN_CREATE'

  composers (tc: TokenCreate): BufferComposer[] {
    return [
      ComposableBuffer.varUIntUtf8BE(() => tc.symbol, v => tc.symbol = v),
      ComposableBuffer.varUIntUtf8BE(() => tc.name, v => tc.name = v),
      ComposableBuffer.uInt8(() => tc.decimal, v => tc.decimal = v),
      ComposableBuffer.bigNumberUInt64(() => tc.limit, v => tc.limit = v),
      ComposableBuffer.bitmask1Byte(3, () => [tc.isDAT, tc.tradeable, tc.mintable], v => {
        tc.isDAT = v[0]
        tc.tradeable = v[1]
        tc.mintable = v[2]
      })
    ]
  }
}
