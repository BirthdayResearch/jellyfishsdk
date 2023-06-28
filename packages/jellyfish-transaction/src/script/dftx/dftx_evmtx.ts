import { BufferComposer, ComposableBuffer } from '@defichain/jellyfish-buffer'

/**
 * EvmTx Transaction
 */
export interface EvmTx {
  raw: string // -----------------------| hex string
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
      ComposableBuffer.compactSizeHex(() => e.raw, (v) => (e.raw = v))
    ]
  }
}
