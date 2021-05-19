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
  static OP_NAME = 'OP_DEFI_TX_APPOINT_ORACLE'

  composers (ao: AppointOracle): BufferComposer[] {
    return [
      ComposableBuffer.single<Script>(() => ao.script, v => ao.script = v, v => new CScript(v)),
      ComposableBuffer.uInt8(() => ao.weightage, v => ao.weightage = v),
      ComposableBuffer.varUIntArray(() => ao.pricefeeds, v => ao.pricefeeds = v, v => new CCurrencyPair(v))
    ]
  }
}

/**
 * RemoveOracle DeFi Transaction
 */
 export interface RemoveOracle {
  script: Script // --------------------| n = VarUInt{1-9 bytes}, + n bytes
  oracleId: string // -------------------| string
}

/**
 * Composable RemoveOracle, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CRemoveOracle extends ComposableBuffer<RemoveOracle> {
  static OP_CODE = 0x68
  static OP_NAME = 'OP_DEFI_TX_REMOVE_ORACLE'

  composers (ao: RemoveOracle): BufferComposer[] {
    return [
      ComposableBuffer.single<Script>(() => ao.script, v => ao.script = v, v => new CScript(v)),
      ComposableBuffer.single<string>(() => ao.oracleId, v => ao.oracleId = v, v => SmartBuffer.fromBuffer(Buffer.from(v, 'ascii')))
    ]
  }
}


/**
 * UpdateOracle DeFi Transaction
 */
 export interface UpdateOracle {
  oracleId: string // -------------------| string
  script: Script // --------------------| n = VarUInt{1-9 bytes}, + n bytes
  weightage: number // -------------------| 1 byte unsigned
  pricefeeds: CurrencyPair[] // -----------------| array of strings each max 8 bytes
}

/**
 * Composable UpdateOracle, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CUpdateOracle extends ComposableBuffer<UpdateOracle> {
  static OP_CODE = 0x74
  static OP_NAME = 'OP_DEFI_TX_UPDATE_ORACLE'

  composers (ao: UpdateOracle): BufferComposer[] {
    return [
      ComposableBuffer.single<string>(() => ao.oracleId, v => ao.oracleId = v, v => SmartBuffer.fromBuffer(Buffer.from(v, 'ascii'))),
      ComposableBuffer.single<Script>(() => ao.script, v => ao.script = v, v => new CScript(v)),
      ComposableBuffer.uInt8(() => ao.weightage, v => ao.weightage = v),
      ComposableBuffer.varUIntArray(() => ao.pricefeeds, v => ao.pricefeeds = v, v => new CCurrencyPair(v))
    ]
  }
}


/**
 * SetOracleData DeFi Transaction
 */
 export interface SetOracleData {
  oracleId: string // -------------------| string
  timestamp: number // -------------------| 4 bytes unsigned
  prices: CurrencyPair[] // -----------------| array of strings each max 8 bytes
}

/**
 * Composable SetOracleData, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CSetOracleData extends ComposableBuffer<SetOracleData> {
  static OP_CODE = 0x79
  static OP_NAME = 'OP_DEFI_TX_SET_ORACLE_DATA'

  composers (ao: SetOracleData): BufferComposer[] {
    return [
      ComposableBuffer.single<string>(() => ao.oracleId, v => ao.oracleId = v, v => SmartBuffer.fromBuffer(Buffer.from(v, 'ascii'))),
      ComposableBuffer.uInt32(() => ao.timestamp, v => ao.timestamp = v),
      ComposableBuffer.varUIntArray(() => ao.prices, v => ao.prices = v, v => new CCurrencyPair(v))
    ]
  }
}
