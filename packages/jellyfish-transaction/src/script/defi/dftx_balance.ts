import BigNumber from 'bignumber.js'
import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'
import { Script } from '../../tx'
import { CScript } from '../../tx_composer'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

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
 * UtxosToAccount DeFi Transaction
 */
export interface UtxosToAccount {
  to: ScriptBalances[] // --------------| n = VarUInt{1-9 bytes}, + n bytes
}

/**
 * Composable UtxosToAccount, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CUtxosToAccount extends ComposableBuffer<UtxosToAccount> {
  static OP_CODE = 0x55 // 'U'
  static OP_NAME = 'DEFI_OP_UTXOS_TO_ACCOUNT'

  composers (u2a: UtxosToAccount): BufferComposer[] {
    return [
      ComposableBuffer.varUIntArray(() => u2a.to, v => u2a.to = v, v => new CScriptBalances(v))
    ]
  }
}

/**
 * AccountToUtxos DeFi Transaction
 */
export interface AccountToUtxos {
  from: ScriptBalances[] // ------------| n = VarUInt{1-9 bytes}, + n bytes
  mintingOutputStart: number
}

/**
 * Composable UtxosToAccount, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CAccountToUtxos extends ComposableBuffer<AccountToUtxos> {
  static OP_CODE = 0x62 // 'b'
  static OP_NAME = 'DEFI_OP_ACCOUNT_TO_UTXOS'

  composers (a2u: AccountToUtxos): BufferComposer[] {
    return [
      ComposableBuffer.varUIntArray(() => a2u.from, v => a2u.from = v, v => new CScriptBalances(v)),
      ComposableBuffer.uInt32(() => a2u.mintingOutputStart, v => a2u.mintingOutputStart = v)
    ]
  }
}

/**
 * AccountToAccount DeFi Transaction
 */
export interface AccountToAccount {
  from: Script // ----------------------| n = VarUInt{1-9 bytes}, + n bytes
  to: ScriptBalances[] // --------------| n = VarUInt{1-9 bytes}, + n bytes
}

/**
 * Composable UtxosToAccount, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CAccountToAccount extends ComposableBuffer<AccountToAccount> {
  static OP_CODE = 0x42 // 'B'
  static OP_NAME = 'DEFI_OP_ACCOUNT_TO_ACCOUNT'

  composers (a2a: AccountToAccount): BufferComposer[] {
    return [
      ComposableBuffer.single<Script>(() => a2a.from, v => a2a.from = v, v => new CScript(v)),
      ComposableBuffer.varUIntArray(() => a2a.to, v => a2a.to = v, v => new CScriptBalances(v))
    ]
  }
}
