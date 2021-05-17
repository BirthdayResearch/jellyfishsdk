import BigNumber from 'bignumber.js'
import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'
import { Script } from '../../tx'
import { CScript } from '../../tx_composer'
import { SmartBuffer } from 'smart-buffer'
import { readBigNumberUInt64, writeBigNumberUInt64 } from '../../buffer/buffer_bignumber'
import { CScriptBalances, ScriptBalances } from './dftx_balance'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

export interface CurrencyPair {
  token: string // ---------------------| max 8 bytes
  currency: string // -----------------| max 8 bytes
}

/**
 * Composable CurrencyPair, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CCurrencyPair extends ComposableBuffer<CurrencyPair> {
  composers (cp: CurrencyPair): BufferComposer[] {
    return [
      ComposableBuffer.single<string>(() => cp.token, v => cp.token = v, v => SmartBuffer.fromBuffer(Buffer.from(v, 'ascii'))),
      ComposableBuffer.single<string>(() => cp.currency, v => cp.currency = v, v => SmartBuffer.fromBuffer(Buffer.from(v, 'ascii')))
    ]
  }
}

/**
 * AppointOracle DeFi Transaction
 */
export interface AppointOracle {
  script: Script // --------------------| n = VarUInt{1-9 bytes}, + n bytes
  weightage: number // -------------------| 1 byte unsigned
  pricefeeds: CurrencyPair[] // -----------------| array of strings each max 8 bytes
}

/**
 * Composable AppointOracle, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CAppointOracle extends ComposableBuffer<AppointOracle> {
  static OP_CODE = 0x6f
  static OP_NAME = 'DEFI_OP_APPOINT_ORACLE'

  composers (ao: AppointOracle): BufferComposer[] {
    return [
      ComposableBuffer.single<Script>(() => ao.script, v => ao.script = v, v => new CScript(v)),
      ComposableBuffer.uInt8(() => ao.weightage, v => ao.weightage = v),
      ComposableBuffer.varUIntArray(() => ao.pricefeeds, v => ao.pricefeeds = v, v => new CCurrencyPair(v))
    ]
  }
}
