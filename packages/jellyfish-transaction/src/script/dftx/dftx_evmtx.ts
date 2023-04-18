import BigNumber from 'bignumber.js'
import { BufferComposer, ComposableBuffer } from '@defichain/jellyfish-buffer'

/**
 * EvmTx Transaction
 */
export interface EvmTx {
  // TODO (lyka): revisit these types
  from: string // --------------------| VarUInt{1-9 bytes}, + n bytes
  nonce: number // -------------------| VarInt{MSB-b128}
  gasPrice: number // ----------------| VarInt{MSB-b128}
  gasLimit: number // ----------------| VarInt{MSB-b128}
  to: string // ----------------------| VarUInt{1-9 bytes}, + n bytes
  value: BigNumber // ----------------| 8 bytes unsigned
  data: string // --------------------| hex string
}

/**
 * Composable EvmTx, C stands for Composable
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CEvmTx extends ComposableBuffer<EvmTx> {
  static OP_CODE = 0x39 // '9'
  static OP_NAME = 'OP_DEFI_TX_EVM_TX'

  composers (e: EvmTx): BufferComposer[] {
    return [
      ComposableBuffer.compactSizeUtf8BE(() => e.from, (v) => (e.from = v)),
      ComposableBuffer.varInt(() => e.nonce, (v) => (e.nonce = v)),
      ComposableBuffer.varInt(() => e.gasPrice, (v) => (e.gasPrice = v)),
      ComposableBuffer.varInt(() => e.gasLimit, (v) => (e.gasLimit = v)),
      ComposableBuffer.compactSizeUtf8BE(() => e.to, (v) => (e.to = v)),
      ComposableBuffer.satoshiAsBigNumber(() => e.value, (v) => (e.value = v)),
      ComposableBuffer.compactSizeUtf8BE(() => e.data, (v) => (e.data = v))
    ]
  }
}
