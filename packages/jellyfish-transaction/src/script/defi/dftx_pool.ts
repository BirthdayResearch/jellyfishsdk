import BigNumber from 'bignumber.js'
import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'
import { Script } from '../../tx'
import { CScript } from '../../tx_composer'
import { SmartBuffer } from 'smart-buffer'
import { readBigNumberUInt64, writeBigNumberUInt64 } from '../../buffer/buffer_bignumber'
import { CScriptBalances, ScriptBalances, TokenBalance, CTokenBalance } from './dftx_balance'
import { writeVarUInt, readVarUInt } from '../../buffer/buffer_varuint'

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
  static OP_NAME = 'OP_DEFI_TX_POOL_SWAP'

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

/**
 * Composable PoolAddLiquidity, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CPoolAddLiquidity extends ComposableBuffer<PoolAddLiquidity> {
  static OP_CODE = 0x6c
  static OP_NAME = 'OP_DEFI_TX_POOL_ADD_LIQUIDITY'

  composers (p: PoolAddLiquidity): BufferComposer[] {
    return [
      ComposableBuffer.varUIntArray(() => p.from, v => p.from = v, v => new CScriptBalances(v)),
      ComposableBuffer.single<Script>(() => p.shareAddress, v => p.shareAddress = v, v => new CScript(v))
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
  static OP_NAME = 'OP_DEFI_TX_POOL_REMOVE_LIQUIDITY'

  composers (p: PoolRemoveLiquidity): BufferComposer[] {
    return [
      ComposableBuffer.single<Script>(() => p.script, v => p.script = v, v => new CScript(v)),
      ComposableBuffer.varUInt(() => p.tokenId, v => p.tokenId = v),
      ComposableBuffer.satoshiAsBigNumber(() => p.amount, v => p.amount = v)
    ]
  }
}

/**
 * PoolCreatePair DeFi Transaction
 */
export interface PoolCreatePair {
  tokenA: number // -----------------------| VarUInt{1-9 bytes}
  tokenB: number // -----------------------| VarUInt{1-9 bytes}
  commission: BigNumber // ----------------| 8 bytes
  ownerAddress: Script // -----------------| n = VarUInt{1-9 bytes}, + n bytes
  status: boolean // ----------------------| 1 byte
  pairSymbol: string // -------------------| VarUInt{1-9 bytes}, + c bytes UTF encoded string
  customRewards: TokenBalance[] // --------| c = VarUInt{1-9 bytes}, + c x TokenBalance
}

/**
 * Composable PoolCreatePair, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CPoolCreatePair extends ComposableBuffer<PoolCreatePair> {
  static OP_CODE = 0x70
  static OP_NAME = 'DEFI_OP_POOL_CREATE_PAIR'

  composers (p: PoolCreatePair): BufferComposer[] {
    return [
      ComposableBuffer.varUInt(() => p.tokenA, v => p.tokenA = v),
      ComposableBuffer.varUInt(() => p.tokenB, v => p.tokenB = v),
      ComposableBuffer.satoshiAsBigNumber(() => p.commission, v => p.commission = v),
      ComposableBuffer.single<Script>(() => p.ownerAddress, v => p.ownerAddress = v, v => new CScript(v)),
      ComposableBuffer.bool(() => p.status, v => p.status = v),
      ComposableBuffer.varUIntUtf8BE(() => p.pairSymbol, v => p.pairSymbol = v),
      // Note(canonbrother): special fix for inconsistent bytes in "block height >= ClarkeQuayHeight" condition
      // https://github.com/DeFiCh/ain/blob/4b70ecd8ee32d00c75be04a786dc75ec4a3c91dd/src/masternodes/rpc_poolpair.cpp#L571-L573
      {
        fromBuffer: (buffer: SmartBuffer): void => {
          if (buffer.remaining() > 0) {
            const length = readVarUInt(buffer)
            p.customRewards = []
            for (let i = 0; i < length; i++) {
              p.customRewards.push(new CTokenBalance(buffer).toObject())
            }
          }
        },
        toBuffer: (buffer: SmartBuffer): void => {
          if (p.customRewards !== undefined) {
            const array = p.customRewards
            writeVarUInt(array.length, buffer)
            array.forEach(data => new CTokenBalance(data).toBuffer(buffer))
          }
        }
      }
    ]
  }
}
