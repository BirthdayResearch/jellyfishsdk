import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'
import { TokenBalance, CTokenBalance } from './dftx_balance'
import { Script } from '../../tx'
import { CScript } from '../../tx_composer'

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
  isDAT: number // ----------------------| 1 byte
  mintable: number // -------------------| 1 byte
  tradeable: number // ------------------| 1 byte
  collateralAddress: Script // ----------| n = VarUInt{1-9 bytes}, + n bytes
  decimal: number // --------------------| 2 bytes
  limit: number // ----------------------| 4 bytes
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
      ComposableBuffer.uInt8(() => tc.isDAT, v => tc.isDAT = v),
      ComposableBuffer.uInt8(() => tc.mintable, v => tc.mintable = v),
      ComposableBuffer.uInt8(() => tc.tradeable, v => tc.tradeable = v),
      ComposableBuffer.single<Script>(() => tc.collateralAddress, v => tc.collateralAddress = v, v => new CScript(v)),
      ComposableBuffer.uInt16(() => tc.decimal, v => tc.decimal = v),
      ComposableBuffer.uInt32(() => tc.limit, v => tc.limit = v)
    ]
  }
}
