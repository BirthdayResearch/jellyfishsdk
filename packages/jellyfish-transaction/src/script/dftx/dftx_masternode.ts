import { SmartBuffer } from 'smart-buffer'
import { BufferComposer, ComposableBuffer } from '@defichain/jellyfish-buffer'

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

export interface UpdateMasternodeAddress {
  addressType: number // --------------------------| 1 byte, 0x01 = p2pkh, 0x04 = p2wpkh
  addressPubKeyHash?: string // -------------------| VarUInt{20 bytes}
}

/**
 * Composable TokenBalance, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CUpdateMasternodeAddress extends ComposableBuffer<UpdateMasternodeAddress> {
  composers (umn: UpdateMasternodeAddress): BufferComposer[] {
    return [
      ComposableBuffer.uInt8(() => umn.addressType, v => umn.addressType = v),
      ComposableBuffer.compactSizeOptionalHex(() => umn.addressPubKeyHash, v => umn.addressPubKeyHash = v)
    ]
  }
}

interface UpdateMasternodeData {
  updateType: number // ----| 1 byte, 0x01 = OwnerAddress, 0x02 = OperatorAddress, 0x03 = SetRewardAddress, 0x04 = RemRewardAddress
  address: UpdateMasternodeAddress
}

/**
 * Composable TokenBalance, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CUpdateMasternodeData extends ComposableBuffer<UpdateMasternodeData> {
  composers (umn: UpdateMasternodeData): BufferComposer[] {
    return [
      ComposableBuffer.uInt8(() => umn.updateType, v => umn.updateType = v),
      ComposableBuffer.single<UpdateMasternodeAddress>(() => umn.address, v => umn.address = v, v => new CUpdateMasternodeAddress(v))
    ]
  }
}

/**
 * UpdateMasternode DeFi Transaction
 */
export interface UpdateMasternode {
  nodeId: string // --------------------------------| VarUInt{32 bytes}
  updates: UpdateMasternodeData[]
}

/**
 * Composable UpdateMasternode, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CUpdateMasternode extends ComposableBuffer<UpdateMasternode> {
  static OP_CODE = 0x6d // 'm'
  static OP_NAME = 'OP_DEFI_TX_UPDATE_MASTER_NODE'

  composers (umn: UpdateMasternode): BufferComposer[] {
    return [
      ComposableBuffer.hexBEBufferLE(32, () => umn.nodeId, v => umn.nodeId = v),
      ComposableBuffer.compactSizeArray(() => umn.updates, v => umn.updates = v, v => new CUpdateMasternodeData(v))
    ]
  }
}
