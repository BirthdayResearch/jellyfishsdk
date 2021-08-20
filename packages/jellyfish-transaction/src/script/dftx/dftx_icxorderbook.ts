import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'
import BigNumber from 'bignumber.js'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

/**
 * ICXSubmitDFCHTLC DeFi transaction
 */
export interface ICXSubmitDFCHTLC {
  offerTx: string // ----| 32 byte, txid for which offer is this HTLC
  amount: BigNumber // --| 8 byte, amount that is put in HTLC
  hash: string // -------| 32 byte, hash for the hash lock part
  timeout: number // ----| 4 byte, timeout (absolute in blocks) for timelock part
}

/**
 * Composable ICXSubmitDFCHTLC, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CICXSubmitDFCHTLC extends ComposableBuffer<ICXSubmitDFCHTLC> {
  static OP_CODE = 0x33
  static OP_NAME = 'OP_DEFI_TX_ICX_SUBMIT_DFC_HTLC'

  composers (msg: ICXSubmitDFCHTLC): BufferComposer[] {
    return [
      ComposableBuffer.hexBEBufferLE(32, () => msg.offerTx, v => msg.offerTx = v),
      ComposableBuffer.satoshiAsBigNumber(() => msg.amount, v => msg.amount = v),
      ComposableBuffer.hexBEBufferLE(32, () => msg.hash, v => msg.hash = v),
      ComposableBuffer.uInt32(() => msg.timeout, v => msg.timeout = v)
    ]
  }
}
