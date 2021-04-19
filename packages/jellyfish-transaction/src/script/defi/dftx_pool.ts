import BigNumber from 'bignumber.js'
import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'
import { Script } from '../../tx'
import { CScript } from '../../tx_composer'
import { SmartBuffer } from 'smart-buffer'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

/**
 * A poolswap transaction.
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
          const integer = new BigNumber(buffer.readBigUInt64LE().toString())
          const fraction = new BigNumber(buffer.readBigUInt64LE().toString())
          ps.maxPrice = { integer, fraction }
        },
        toBuffer (buffer: SmartBuffer) {
          const { integer, fraction } = ps.maxPrice
          buffer.writeBigUInt64LE(BigInt(integer.toString(10)))
          buffer.writeBigUInt64LE(BigInt(fraction.toString(10)))
        }
      }
    ]
  }
}
