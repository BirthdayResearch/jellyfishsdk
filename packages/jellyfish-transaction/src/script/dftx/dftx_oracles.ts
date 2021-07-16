import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'
import { CurrencyPair, CCurrencyPair, CTokenPrice, TokenPrice } from './dftx_price'
import { Script } from '../../tx'
import { CScript } from '../../tx_composer'
import BigNumber from 'bignumber.js'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

/**
 * AppointOracle DeFi Transaction
 */
export interface AppointOracle {
  script: Script // ---------------------| n = VarUInt{1-9 bytes}, + n bytes
  weightage: number // ------------------| 1 byte unsigned int
  priceFeeds: CurrencyPair[] // ---------| c = VarUInt{1-9 bytes}, + c x CurrencyPair
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
      ComposableBuffer.varUIntArray(() => ao.priceFeeds, v => ao.priceFeeds = v, v => new CCurrencyPair(v))
    ]
  }
}

/**
 * RemoveOracle DeFi Transaction
 */
export interface RemoveOracle {
  oracleId: string // -------------------| 32 bytes hex string
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
      ComposableBuffer.hexBEBufferLE(32, () => ao.oracleId, v => ao.oracleId = v)
    ]
  }
}

/**
 * UpdateOracle DeFi Transaction
 */
export interface UpdateOracle {
  oracleId: string // -------------------| 32 bytes hex string
  script: Script // ---------------------| n = VarUInt{1-9 bytes}, + n bytes
  weightage: number // ------------------| 1 byte unsigned int
  priceFeeds: CurrencyPair[] // ---------| c = VarUInt{1-9 bytes}, + c x CurrencyPair
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
      ComposableBuffer.hexBEBufferLE(32, () => ao.oracleId, v => ao.oracleId = v),
      ComposableBuffer.single<Script>(() => ao.script, v => ao.script = v, v => new CScript(v)),
      ComposableBuffer.uInt8(() => ao.weightage, v => ao.weightage = v),
      ComposableBuffer.varUIntArray(() => ao.priceFeeds, v => ao.priceFeeds = v, v => new CCurrencyPair(v))
    ]
  }
}

/**
 * SetOracleData DeFi Transaction
 */
export interface SetOracleData {
  oracleId: string // -------------------| 32 bytes hex string
  timestamp: BigNumber // ---------------| 8 bytes unsigned integer
  tokens: TokenPrice[] // ---------------| c = VarUInt{1-9 bytes}, + c x TokenPrice
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
      ComposableBuffer.hexBEBufferLE(32, () => ao.oracleId, v => ao.oracleId = v),
      ComposableBuffer.bigNumberUInt64(() => ao.timestamp, v => ao.timestamp = v),
      ComposableBuffer.varUIntArray(() => ao.tokens, v => ao.tokens = v, v => new CTokenPrice(v))
    ]
  }
}
