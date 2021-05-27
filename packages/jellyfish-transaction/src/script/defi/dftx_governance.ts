import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { readBigNumberUInt64, writeBigNumberUInt64 } from '../../buffer/buffer_bignumber'
import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'

// Disabling no-return-assign makes the code cleaner with the setter and getter */
/* eslint-disable no-return-assign */

export interface LiqPoolSplit {
  tokenId: number // -------------------| 4 bytes unsigned
  value: BigNumber // ------------------| 8 bytes unsigned
}

export class CLiqPoolSplit extends ComposableBuffer<LiqPoolSplit> {
  composers (lps: LiqPoolSplit): BufferComposer[] {
    return [
      ComposableBuffer.uInt32(() => lps.tokenId, v => lps.tokenId = v),
      ComposableBuffer.satoshiAsBigNumber(() => lps.value, v => lps.value = v)
    ]
  }
}

export interface GovernanceVar {
  key: string // -----------------------| VarUInt{1-9 bytes}
  value: BigNumber | LiqPoolSplit[] // -| VarUInt{8 OR 1 + n * 12 bytes}, case LiqPoolSplit: first byte = array len
}

export class CGovernanceVar extends ComposableBuffer<GovernanceVar> {
  composers (gv: GovernanceVar): BufferComposer[] {
    return [
      ComposableBuffer.varUIntUtf8BE(() => gv.key, v => gv.key = v),
      {
        fromBuffer: (buffer: SmartBuffer): void => {
          if (gv.key === 'LP_DAILY_DFI_REWARD') {
            gv.value = readBigNumberUInt64(buffer).div('1e8')
          } else if (gv.key === 'LP_SPLITS') {
            gv.value = []
            const configLen = buffer.readUInt8()
            for (let i = 0; i < configLen; i++) {
              gv.value.push(new CLiqPoolSplit(buffer).toObject())
            }
          } else {
            throw new Error(`Unrecognized Governance Variable type: ${gv.key}`)
          }
        },
        toBuffer: (buffer: SmartBuffer): void => {
          if (gv.key === 'LP_DAILY_DFI_REWARD') {
            writeBigNumberUInt64((gv.value as BigNumber).times('1e8'), buffer)
          } else if (gv.key === 'LP_SPLITS') {
            const lpss = gv.value as LiqPoolSplit[]
            buffer.writeUInt8(lpss.length)
            lpss.forEach(lps => new CLiqPoolSplit(lps).toBuffer(buffer))
          } else {
            throw new Error(`Unrecognized Governance Variable type: ${gv.key}`)
          }
        }
      }
    ]
  }
}

export interface SetGovernance {
  governanceVars: GovernanceVar[]
}

/**
 * Composable TokenBalance, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CSetGovernance extends ComposableBuffer<SetGovernance> {
  static OP_CODE = 0x47 // 'G'
  static OP_NAME = 'OP_DEFI_TX_SET_GOVERNANCE'

  composers (gvs: SetGovernance): BufferComposer[] {
    return [
      {
        fromBuffer: (buffer: SmartBuffer): void => {
          gvs.governanceVars = []
          while (buffer.remaining() > 0) {
            gvs.governanceVars.push(new CGovernanceVar(buffer).toObject())
          }
        },
        toBuffer: (buffer: SmartBuffer): void => {
          gvs.governanceVars.forEach(gv =>
            new CGovernanceVar(gv).toBuffer(buffer)
          )
        }
      }
    ]
  }
}
