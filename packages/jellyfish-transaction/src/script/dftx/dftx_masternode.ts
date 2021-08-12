import { SmartBuffer } from 'smart-buffer'
import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

/**
 * CreateMasternode DeFi Transaction
 */
export interface CreateMasternode {
  operatorType: number // --------------------------| 1 byte, 0x01 = p2pkh, 0x04 = p2wpkh
  operatorAuthAddress: string // -------------------| VarUInt{20 bytes}
  timelock?: number // -----------------------------| 2 bytes
}

/**
 * Composable CreateMasternode, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CCreateMasternode extends ComposableBuffer<CreateMasternode> {
  static OP_CODE = 0x43 // 'C'
  static OP_NAME = 'OP_DEFI_TX_CREATE_MASTER_NODE'

  composers (cmn: CreateMasternode): BufferComposer[] {
    return [
      ComposableBuffer.uInt8(() => cmn.operatorType, v => cmn.operatorType = v),
      ComposableBuffer.hex(20, () => cmn.operatorAuthAddress, v => cmn.operatorAuthAddress = v),
      {
        fromBuffer: (buffer: SmartBuffer): void => {
          if (buffer.remaining() > 0) {
            cmn.timelock = buffer.readUInt16LE()
          }
        },
        toBuffer: (buffer: SmartBuffer): void => {
          if (cmn.timelock !== undefined) {
            buffer.writeUInt16LE(cmn.timelock)
          }
        }
      }
    ]
  }
}

/**
 * ResignMasterNode DeFi Transaction
 */
export interface ResignMasterNode {
  nodeId: string // --------------------------------| VarUInt{32 bytes}
}

/**
 * Composable ResignMasterNode, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CResignMasterNode extends ComposableBuffer<ResignMasterNode> {
  static OP_CODE = 0x52 // 'R'
  static OP_NAME = 'OP_DEFI_TX_RESIGN_MASTER_NODE'

  composers (cmn: ResignMasterNode): BufferComposer[] {
    return [
      ComposableBuffer.hexBEBufferLE(32, () => cmn.nodeId, v => cmn.nodeId = v)
    ]
  }
}
