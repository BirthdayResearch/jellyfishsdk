import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { BufferComposer, ComposableBuffer, readBigNumberUInt64, writeBigNumberUInt64 } from '@defichain/jellyfish-buffer'
import { Script } from '../../tx'
import { CScript } from '../../tx_composer'

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

export interface SetGovernanceHeight {
  governanceVars: GovernanceVar[]
  activationHeight: number
}

/**
 * Composable CSetGovernanceHeight, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CSetGovernanceHeight extends ComposableBuffer<SetGovernanceHeight> {
  static OP_CODE = 0x6a // 'j'
  static OP_NAME = 'OP_DEFI_TX_SET_GOVERNANCE_HEIGHT'

  composers (gvs: SetGovernanceHeight): BufferComposer[] {
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
      },
      ComposableBuffer.varUInt(() => gvs.activationHeight, v => gvs.activationHeight = v)
    ]
  }
}

export type ProposalType = 0x01 | 0x03 // 0x01 (CommunityFundRequest) | 0x03 (VoteOfConfidence)
export type ProposalCycles = 0x01 | 0x02 | 0x03

export interface CreateProposal {
  type: ProposalType // ---------| 1 byte unsigned int
  address: Script // ------------| n = VarUInt{1-9 bytes}, + n bytes
  amount: BigNumber // ----------| 8 bytes unsigned
  cycles: ProposalCycles // -----| 1 byte unsigned int
  title: string // --------------| c = VarUInt{1-9 bytes}, + c bytes UTF encoded string
}

export interface CreateCfp extends CreateProposal {
  type: 0x01
}
export interface CreateVoc extends CreateProposal {
  type: 0x03
  cycles: 0x02
}

/**
 * Composable CCreateProposal, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CCreateProposal extends ComposableBuffer<CreateProposal> {
  composers (ccp: CreateCfp | CreateVoc): BufferComposer[] {
    return [
      ComposableBuffer.uInt8(() => ccp.type, v => ccp.type = v as ProposalType),
      ComposableBuffer.single<Script>(() => ccp.address, v => ccp.address = v, v => new CScript(v)),
      ComposableBuffer.satoshiAsBigNumber(() => ccp.amount, v => ccp.amount = v),
      ComposableBuffer.uInt8(() => ccp.cycles, v => ccp.cycles = v as ProposalCycles),
      ComposableBuffer.varUIntUtf8BE(() => ccp.title, v => ccp.title = v)
    ]
  }
}

export class CCreateCfp extends CCreateProposal {
  static OP_CODE = 0x65 // 'e'
  static OP_NAME = 'OP_DEFI_TX_CREATE_CFP'
}

export class CCreateVoc extends CCreateProposal {
  static OP_CODE = 0x45 // 'E'
  static OP_NAME = 'OP_DEFI_TX_CREATE_VOC'
}

export type VoteDecision = 0x01 | 0x02 | 0x03 // VoteYes | VoteNo | VoteNeutral

export interface Vote {
  proposalId: string // -----------| 32 bytes hex string
  masternodeId: string // ---------| 32 bytes hex string
  voteDecision: VoteDecision // ---| 1 byte unsigned int
}

/**
 * Composable CVote, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CVote extends ComposableBuffer<Vote> {
  static OP_CODE = 0x4f // 'O'
  static OP_NAME = 'OP_DEFI_TX_CREATE_CFP'
  composers (vote: Vote): BufferComposer[] {
    return [
      ComposableBuffer.hexBEBufferLE(32, () => vote.proposalId, v => vote.proposalId = v),
      ComposableBuffer.hexBEBufferLE(32, () => vote.masternodeId, v => vote.masternodeId = v),
      ComposableBuffer.uInt8(() => vote.voteDecision, v => vote.voteDecision = v as VoteDecision)
    ]
  }
}
