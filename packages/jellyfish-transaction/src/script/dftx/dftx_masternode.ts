import { SmartBuffer } from 'smart-buffer'
import { BufferComposer, ComposableBuffer } from '@defichain/jellyfish-buffer'
import { Script } from '../../tx'
import { CScript } from '../../tx_composer'

/**
 * CreateMasternode DeFi Transaction
 */
export interface CreateMasternode {
  operatorType: number // --------------------------| 1 byte, 0x01 = p2pkh, 0x04 = p2wpkh
  operatorPubKeyHash: string // -------------------| VarUInt{20 bytes}
  timelock?: number // -----------------------------| 2 bytes, 0x0401 = 5 years, 0x0802 = 10 years
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
      ComposableBuffer.hex(20, () => cmn.operatorPubKeyHash, v => cmn.operatorPubKeyHash = v),
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
 * ResignMasternode DeFi Transaction
 */
export interface ResignMasternode {
  nodeId: string // --------------------------------| VarUInt{32 bytes}
}

/**
 * Composable ResignMasternode, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CResignMasternode extends ComposableBuffer<ResignMasternode> {
  static OP_CODE = 0x52 // 'R'
  static OP_NAME = 'OP_DEFI_TX_RESIGN_MASTER_NODE'

  composers (cmn: ResignMasternode): BufferComposer[] {
    return [
      ComposableBuffer.hexBEBufferLE(32, () => cmn.nodeId, v => cmn.nodeId = v)
    ]
  }
}

/**
 * UpdateMasternode DeFi Transaction
 */
// export interface UpdateMasternodeValues {
//   ownerAddress?: string
//   operatorAddress?: string
//   rewardAddress?: string
// }
export interface UpdateMasternode {
  nodeId: string // --------------------------------| VarUInt{32 bytes}
  ownerAddress?: Script
  operatorAddress?: Script
  rewardAddress?: Script
}

/**
 * Composable UpdateMasternode, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CUpdateMasternode extends ComposableBuffer<UpdateMasternode> {
  static OP_CODE = 0x6D // 'm'
  static OP_NAME = 'OP_DEFI_TX_UPDATE_MASTER_NODE'

  composers (umn: UpdateMasternode): BufferComposer[] {
    let { ownerAddress, operatorAddress, rewardAddress } = umn
    const bufferComposer = [
      ComposableBuffer.hexBEBufferLE(32, () => umn.nodeId, v => umn.nodeId = v)
    ]
    if (typeof ownerAddress !== 'undefined') {
      bufferComposer.push(ComposableBuffer.single<Script>(() => ownerAddress as Script, v => ownerAddress = v, v => new CScript(v)))
    }
    if (typeof ownerAddress !== 'undefined') {
      bufferComposer.push(ComposableBuffer.single<Script>(() => operatorAddress as Script, v => operatorAddress = v, v => new CScript(v)))
    }
    if (typeof ownerAddress !== 'undefined') {
      bufferComposer.push(ComposableBuffer.single<Script>(() => rewardAddress as Script, v => rewardAddress = v, v => new CScript(v)))
    }
    return bufferComposer
  }
}
