import { SmartBuffer } from 'smart-buffer'
import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'
import { Operation } from './dftx'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

/**
 * Unmapped DeFi OP that is valid but don't have a composer for it yet.
 */
export interface UnmappedOperation extends Operation {
  /**
   * Stored as LITTLE ENDIAN hex string.
   */
  hex: string
}

export class CUnmappedOperation extends ComposableBuffer<UnmappedOperation> {
  composers (op: UnmappedOperation): BufferComposer[] {
    return [
      {
        fromBuffer: (buffer: SmartBuffer): void => {
          buffer.writeString(op.hex, 'hex')
        },
        toBuffer: (buffer: SmartBuffer): void => {
          op.hex = buffer.readBuffer(buffer.remaining()).toString('hex')
        }
      }
    ]
  }
}
