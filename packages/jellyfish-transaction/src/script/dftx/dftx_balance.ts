import BigNumber from 'bignumber.js'
import { BufferComposer, ComposableBuffer } from '@defichain/jellyfish-buffer'
import { Script } from '../../tx'
import { CScript } from '../../tx_composer'

/**
 * @deprecated renamed to TokenBalanceUInt32
 */
export type TokenBalance = TokenBalanceUInt32

/**
 * Known as "struct CBalances" in cpp.
 */
export interface TokenBalanceUInt32 {
  token: number // ---------------------| 4 bytes unsigned
  amount: BigNumber // -----------------| 8 bytes unsigned
}

/**
 * Known as "struct CBalances" in cpp.
 *
 * Composable TokenBalance, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CTokenBalance extends ComposableBuffer<TokenBalanceUInt32> {
  composers (tb: TokenBalanceUInt32): BufferComposer[] {
    return [
      ComposableBuffer.uInt32(() => tb.token, v => tb.token = v),
      ComposableBuffer.satoshiAsBigNumber(() => tb.amount, v => tb.amount = v)
    ]
  }
}

export interface ScriptBalances {
  script: Script // --------------------| n = VarUInt{1-9 bytes}, + n bytes
  balances: TokenBalanceUInt32[] // ----------| c = VarUInt{1-9 bytes}, + c x TokenBalance
}

/**
 * Composable ScriptBalances, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CScriptBalances extends ComposableBuffer<ScriptBalances> {
  composers (sb: ScriptBalances): BufferComposer[] {
    return [
      ComposableBuffer.single<Script>(() => sb.script, v => sb.script = v, v => new CScript(v)),
      ComposableBuffer.compactSizeArray(() => sb.balances, v => sb.balances = v, v => new CTokenBalance(v))
    ]
  }
}

/**
 * Known as "struct CTokenAmount" in cpp.
 */
export interface TokenBalanceVarInt {
  token: number // ---------------------| VarInt{MSB-b128}
  amount: BigNumber // -----------------| 8 bytes unsigned
}

/**
 * Known as "struct CTokenAmount" in cpp.
 *
 * Composable TokenBalanceVarInt, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CTokenBalanceVarInt extends ComposableBuffer<TokenBalanceVarInt> {
  composers (tb: TokenBalanceVarInt): BufferComposer[] {
    return [
      ComposableBuffer.varInt(() => tb.token, v => tb.token = v),
      ComposableBuffer.satoshiAsBigNumber(() => tb.amount, v => tb.amount = v)
    ]
  }
}
