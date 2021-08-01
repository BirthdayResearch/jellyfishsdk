import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

/**
 * CreateMasterNode DeFi Transaction
 */
export interface CreateMasterNode {
  type: number // ----------------------------------| 1 byte, 0x01 = p2pkh, 0x04 = p2wpkh
  operatorAuthAddress: string // -------------------| VarUInt{20 bytes}
}

/**
 * Composable CreateMasterNode, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CCreateMasterNode extends ComposableBuffer<CreateMasterNode> {
  static OP_CODE = 0x43 // 'C'
  static OP_NAME = 'OP_DEFI_TX_CREATE_MASTER_NODE'

  composers (cmn: CreateMasterNode): BufferComposer[] {
    return [
      ComposableBuffer.uInt8(() => cmn.type, v => cmn.type = v),
      ComposableBuffer.hex(20, () => cmn.operatorAuthAddress, v => cmn.operatorAuthAddress = v)
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
