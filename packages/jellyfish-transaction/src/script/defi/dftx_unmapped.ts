import { SmartBuffer } from 'smart-buffer'
import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

/**
 * Unmapped DeFi OP that is valid but don't have a composer for it yet.
 */
export interface DeFiOpUnmapped {
  /**
   * Stored as LITTLE ENDIAN hex string.
   */
  hex: string
}

export class CDeFiOpUnmapped extends ComposableBuffer<DeFiOpUnmapped> {
  static OP_NAME = 'DEFI_OP_UNMAPPED'

  composers (op: DeFiOpUnmapped): BufferComposer[] {
    return [
      {
        fromBuffer: (buffer: SmartBuffer): void => {
          op.hex = buffer.readBuffer(buffer.remaining()).toString('hex')
        },
        toBuffer: (buffer: SmartBuffer): void => {
          buffer.writeString(op.hex, 'hex')
        }
      }
    ]
  }
}
