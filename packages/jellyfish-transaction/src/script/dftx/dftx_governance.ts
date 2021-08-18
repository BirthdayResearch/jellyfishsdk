import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { readBigNumberUInt64, writeBigNumberUInt64 } from '../../buffer/buffer_bignumber'
import { BufferComposer, ComposableBuffer } from '../../buffer/buffer_composer'
import { Script } from '../../tx'
import { CScript } from '../../tx_composer'

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

export interface GovernanceLpDailyReward {
  key: 'LP_DAILY_DFI_REWARD' // --------| 20 bytes = [0x13, Buffer.from('LP_DAILY_DFI_REWARD', ascii)]
  value: BigNumber // ------------------| 8 bytes unsigned
}

export interface GovernanceLpSplits {
  key: 'LP_SPLITS' // ------------------| 10 bytes = [0x09, Buffer.from('LP_SPLITS', ascii)]
  value: LiqPoolSplit[] // -------------| VarUInt{1 + n * 12 bytes} first byte = config len
}

export interface GovernanceUnmapped {
  key: string // -----------------------| VarUInt{1-9 bytes}, [length, Buffer.from(<'key here'>, ascii)]
  value: string // ---------------------| Unknown length, fill in everything remained in buffer
}

export type GovernanceVar = GovernanceLpDailyReward | GovernanceLpSplits | GovernanceUnmapped

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
            gv.value = buffer.readBuffer().toString('hex')
          }
        },
        toBuffer: (buffer: SmartBuffer): void => {
          if (gv.key === 'LP_DAILY_DFI_REWARD') {
            writeBigNumberUInt64(((gv.value as BigNumber)).times('1e8'), buffer)
          } else if (gv.key === 'LP_SPLITS') {
            const lpss = gv.value as LiqPoolSplit[]
            buffer.writeUInt8(lpss.length)
            lpss.forEach(lps => new CLiqPoolSplit(lps).toBuffer(buffer))
          } else { // UNMAPPED
            buffer.writeBuffer(Buffer.from(gv.value as string, 'hex'))
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
 * Composable CSetGovernance, C stands for Composable.
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
            const govVar = new CGovernanceVar(buffer)
            gvs.governanceVars.push(govVar.toObject())
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

export interface CreateProposal {
  type: number // -------------| 1 byte, 0x01 | 0x02 | 0x03
  address: Script // ----------| n = VarUInt{1-9 bytes}, + n bytes
  amount: BigNumber // --------| 8 bytes unsigned
  cycles: number // -----------| 1 byte unsigned int
  title: string // ------------| c = VarUInt{1-9 bytes}, + c bytes UTF encoded string
}

/**
 * Composable CCreateProposal, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
class CCreateProposal extends ComposableBuffer<CreateProposal> {
  composers (ccp: CreateProposal): BufferComposer[] {
    return [
      ComposableBuffer.uInt8(() => ccp.type, v => ccp.type = v),
      ComposableBuffer.single<Script>(() => ccp.address, v => ccp.address = v, v => new CScript(v)),
      ComposableBuffer.satoshiAsBigNumber(() => ccp.amount, v => ccp.amount = v),
      ComposableBuffer.uInt8(() => ccp.cycles, v => ccp.cycles = v),
      ComposableBuffer.varUIntUtf8BE(() => ccp.title, v => ccp.title = v)
    ]
  }
}

export class CCreateCfp extends CCreateProposal {
  static OP_CODE = 0x46 // 'F'
  static OP_NAME = 'OP_DEFI_TX_CREATE_CFP'
}

export class CCreateVoc extends CCreateProposal {
  static OP_CODE = 0x45 // 'E'
  static OP_NAME = 'OP_DEFI_TX_CREATE_VOC'
}
