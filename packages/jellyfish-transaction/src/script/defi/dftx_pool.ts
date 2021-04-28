import BigNumber from 'bignumber.js'
import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'
import { Script } from '../../tx'
import { CScript } from '../../tx_composer'
import { SmartBuffer } from 'smart-buffer'
import { readBigNumberUInt64, writeBigNumberUInt64 } from '../../buffer/buffer_bignumber'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

/**
 * PoolSwap DeFi Transaction
 */
export interface PoolSwap {
  fromScript: Script // ----------------| n = VarUInt{1-9 bytes}, + n bytes
  fromTokenId: number // ---------------| VarUInt{1-9 bytes}
  fromAmount: BigNumber // -------------| 8 bytes
  toScript: Script // ------------------| n = VarUInt{1-9 bytes}, + n bytes
  toTokenId: number // -----------------| VarUInt{1-9 bytes}
  maxPrice: {
    integer: BigNumber // --------------| 8 bytes
    fraction: BigNumber // -------------| 8 bytes
  }
}

/**
 * Composable PoolSwap, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CPoolSwap extends ComposableBuffer<PoolSwap> {
  static OP_CODE = 0x73
  static OP_NAME = 'DEFI_OP_POOL_SWAP'

  composers (ps: PoolSwap): BufferComposer[] {
    return [
      ComposableBuffer.single<Script>(() => ps.fromScript, v => ps.fromScript = v, v => new CScript(v)),
      ComposableBuffer.varUInt(() => ps.fromTokenId, v => ps.fromTokenId = v),
      ComposableBuffer.satoshiAsBigNumber(() => ps.fromAmount, v => ps.fromAmount = v),
      ComposableBuffer.single<Script>(() => ps.toScript, v => ps.toScript = v, v => new CScript(v)),
      ComposableBuffer.varUInt(() => ps.toTokenId, v => ps.toTokenId = v),
      {
        fromBuffer (buffer: SmartBuffer) {
          const integer = readBigNumberUInt64(buffer)
          const fraction = readBigNumberUInt64(buffer)
          ps.maxPrice = { integer, fraction }
        },
        toBuffer (buffer: SmartBuffer) {
          const { integer, fraction } = ps.maxPrice
          writeBigNumberUInt64(integer, buffer)
          writeBigNumberUInt64(fraction, buffer)
        }
      }
    ]
  }
}

/**
 * PoolAddLiquidity DeFi Transaction
 */
export interface PoolAddLiquidity {
  from: ScriptBalances[] // ------------| c = VarUInt{1-9 bytes}, + c x ScriptBalances
  shareAddress: Script // --------------| n = VarUInt{1-9 bytes}, + n bytes
}

export interface ScriptBalances {
  script: Script // --------------------| n = VarUInt{1-9 bytes}, + n bytes
  balances: TokenBalance[] // ----------| c = VarUInt{1-9 bytes}, + c x TokenBalance
}

export interface TokenBalance {
  token: number // ---------------------| 4 bytes unsigned
  amount: BigNumber // -----------------| 8 bytes unsigned
}

/**
 * Composable PoolAddLiquidity, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CPoolAddLiquidity extends ComposableBuffer<PoolAddLiquidity> {
  static OP_CODE = 0x6c
  static OP_NAME = 'DEFI_OP_POOL_ADD_LIQUIDITY'

  composers (p: PoolAddLiquidity): BufferComposer[] {
    return [
      ComposableBuffer.varUIntArray(() => p.from, v => p.from = v, v => new CScriptBalances(v)),
      ComposableBuffer.single<Script>(() => p.shareAddress, v => p.shareAddress = v, v => new CScript(v))
    ]
  }
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

/**
 * PoolRemoveLiquidity DeFi Transaction
 */
export interface PoolRemoveLiquidity {
  script: Script // --------------------| n = VarUInt{1-9 bytes}, + n bytes
  tokenId: number // -------------------| VarUInt{1-9 bytes}
  amount: BigNumber // -----------------| 8 bytes
}

/**
 * Composable PoolRemoveLiquidity, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CPoolRemoveLiquidity extends ComposableBuffer<PoolRemoveLiquidity> {
  static OP_CODE = 0x72
  static OP_NAME = 'DEFI_OP_POOL_REMOVE_LIQUIDITY'

  composers (p: PoolRemoveLiquidity): BufferComposer[] {
    return [
      ComposableBuffer.single<Script>(() => p.script, v => p.script = v, v => new CScript(v)),
      ComposableBuffer.varUInt(() => p.tokenId, v => p.tokenId = v),
      ComposableBuffer.satoshiAsBigNumber(() => p.amount, v => p.amount = v)
    ]
  }
}
