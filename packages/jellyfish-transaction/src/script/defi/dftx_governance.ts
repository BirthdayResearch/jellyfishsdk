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

export interface GovernanceVar {
  key: string // -----------------------| VarUInt{1-9 bytes}
  value: BigNumber | LiqPoolSplit[] // -| VarUInt{8 OR 1 + n * 12 bytes}, case LiqPoolSplit: first byte = array len
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
            const keyLen = buffer.readUInt8()
            const key = Buffer.from(buffer.readBuffer(keyLen)).toString('utf-8')

            if (key === 'LP_DAILY_DFI_REWARD') {
              gvs.governanceVars.push({
                key,
                value: readBigNumberUInt64(buffer).div('1e8')
              })
            } else if (key === 'LP_SPLITS') {
              const liqSplits: LiqPoolSplit[] = []

              const lpsArrLen = buffer.readUInt8()
              for (let i = 0; i < lpsArrLen; i++) {
                const tokenId = buffer.readUInt32LE()
                const split = readBigNumberUInt64(buffer).div('1e8')
                liqSplits.push({
                  tokenId,
                  value: split
                })
              }
              gvs.governanceVars.push({
                key,
                value: liqSplits
              })
            } else {
              throw new Error(`Unrecognized Governance Variable type: ${key}`)
            }
          }
        },
        toBuffer: (buffer: SmartBuffer): void => {
          for (let i = 0; i < gvs.governanceVars.length; i++) {
            const { key, value } = gvs.governanceVars[i]
            buffer.writeUInt8(key.length)
            buffer.writeBuffer(Buffer.from(key, 'utf-8'))

            if (key === 'LP_DAILY_DFI_REWARD') {
              writeBigNumberUInt64((value as BigNumber).times('1e8'), buffer)
            } else if (key === 'LP_SPLITS') {
              const liqSplits = value as LiqPoolSplit[]
              buffer.writeUInt8(liqSplits.length)

              for (let i = 0; i < liqSplits.length; i++) {
                const ls = liqSplits[i]
                buffer.writeUInt32LE(ls.tokenId)
                writeBigNumberUInt64(ls.value.times('1e8'), buffer)
              }
            } else {
              throw new Error(`Unrecognized Governance Variable type: ${key}`)
            }
          }
        }
      }
    ]
  }
}
