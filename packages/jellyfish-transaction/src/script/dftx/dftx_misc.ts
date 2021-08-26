import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'

/**
 * Composable UtxosToAccount, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CAutoAuthPrep extends ComposableBuffer<{}> {
  static OP_CODE = 0x41 // 'A'
  static OP_NAME = 'OP_DEFI_TX_AUTO_AUTH_PREP'

  constructor () {
    super({})
  }

  composers (): BufferComposer[] {
    return []
  }
}
