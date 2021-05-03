import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'
import { Script } from '../../tx'
import { CScript } from '../../tx_composer'
import { CScriptBalances, CTokenBalance, ScriptBalances, TokenBalance } from './dftx_balance'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

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
  from: Script // -----------------------| n = VarUInt{1-9 bytes}, + n bytes
  balances: TokenBalance[] // -----------| c = VarUInt{1-9 bytes}, + c x TokenBalance
  mintingOutputsStart: number // --------| 4 bytes unsigned
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
      ComposableBuffer.single<Script>(() => a2u.from, v => a2u.from = v, v => new CScript(v)),
      ComposableBuffer.varUIntArray(() => a2u.balances, v => a2u.balances = v, v => new CTokenBalance(v)),
      ComposableBuffer.uInt8(() => a2u.mintingOutputsStart, v => a2u.mintingOutputsStart = v)
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
