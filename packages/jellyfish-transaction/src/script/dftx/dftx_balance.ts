import BigNumber from 'bignumber.js'
import { BufferComposer, ComposableBuffer } from '@defichain/jellyfish-buffer'
import { Script } from '../../tx'
import { CScript } from '../../tx_composer'

export interface TokenBalance {
  token: number // ---------------------| 4 bytes unsigned
  amount: BigNumber // -----------------| 8 bytes unsigned
}

/**
 * Composable TokenBalance, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CTokenBalance extends ComposableBuffer<TokenBalance> {
  composers (tb: TokenBalance): BufferComposer[] {
    return [
      ComposableBuffer.uInt32(() => tb.token, v => tb.token = v),
      ComposableBuffer.satoshiAsBigNumber(() => tb.amount, v => tb.amount = v)
    ]
  }
}

export interface ScriptBalances {
  script: Script // --------------------| n = VarUInt{1-9 bytes}, + n bytes
  balances: TokenBalance[] // ----------| c = VarUInt{1-9 bytes}, + c x TokenBalance
}

/**
 * Composable ScriptBalances, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CScriptBalances extends ComposableBuffer<ScriptBalances> {
  composers (sb: ScriptBalances): BufferComposer[] {
    return [
      ComposableBuffer.single<Script>(() => sb.script, v => sb.script = v, v => new CScript(v)),
      ComposableBuffer.varUIntArray(() => sb.balances, v => sb.balances = v, v => new CTokenBalance(v))
    ]
  }
}

/**
 * TokenBalanceVarInt
 */
export interface TokenBalanceVarInt {
  token: number // ---------------------| VarUInt{1-9 bytes}
  amount: BigNumber // -----------------| 8 bytes unsigned
}

/**
 * Composable TokenBalanceVarInt, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CTokenBalanceVarInt extends ComposableBuffer<TokenBalanceVarInt> {
  composers (tb: TokenBalanceVarInt): BufferComposer[] {
    return [
      ComposableBuffer.varUInt(() => tb.token, v => tb.token = v),
      ComposableBuffer.satoshiAsBigNumber(() => tb.amount, v => tb.amount = v)
    ]
  }
}
