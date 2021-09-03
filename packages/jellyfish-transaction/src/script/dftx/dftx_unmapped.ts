import { SmartBuffer } from 'smart-buffer'
import { BufferComposer, ComposableBuffer } from '@defichain/jellyfish-buffer'

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
  static OP_NAME = 'OP_DEFI_TX_UNMAPPED'

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
