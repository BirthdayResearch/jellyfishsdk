import BigNumber from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { Script, SIGHASH } from './tx'
import { BufferComposer, ComposableBuffer } from './buffer/buffer_composer'
import { CScript } from './tx_composer'

/**
 * V0 Witness program for SegWit WitnessScript.
 *
 * All bytes must be little endian.
 * Script code is a VarUInt bytes Script.
 *
 * For P2WPKH witness program, the scriptCode is 0x1976a914{20-byte-pubkey-hash}88ac.
 * Which is [OP_DUP, OP_HASH160, OP_PUSHDATA<RIPEMD160(SHA256(pubkey))>, OP_EQUALVERIFY, OP_CHECKSIG]
 *
 * For P2WSH witness program, it is not yet supported.
 */
export interface WitnessProgram {
  version: number // --------------------| 4 bytes  - txn.version
  hashPrevouts: string // ---------------| 32 bytes - dSHA256([vin[0].{txid,index},vin[1].{txid,index},...])
  hashSequence: string // ---------------| 32 bytes - dSHA256([vin[0].{sequence},vin[1].{sequence},...])
  outpointTxId: string // ---------------| 32 bytes - vin[n].txid
  outpointIndex: number // --------------| 4 bytes - vin[n].index
  scriptCode: Script // -----------------| n = VarUInt{1-9 bytes} + n bytes
  value: BigNumber // -------------------| 8 bytes  - prevout[n].value
  sequence: number // -------------------| 4 bytes  - vin[n].sequence
  hashOutputs: string // ----------------| 32 bytes - dSHA256([vout[0].{value,script},vout[1].{value,script},...)
  lockTime: number // -------------------| 4 bytes  - txn.lockTime
  hashType: SIGHASH // ------------------| 4 bytes  - SIGHASH
}

/**
 * Composable WitnessProgram
 */
export class CWitnessProgram extends ComposableBuffer<WitnessProgram> {
  /* eslint-disable no-return-assign */

  composers (wp: WitnessProgram): BufferComposer[] {
    return [
      ComposableBuffer.uInt32(() => wp.version, v => wp.version = v),
      ComposableBuffer.hex(32, () => wp.hashPrevouts, v => wp.hashPrevouts = v),
      ComposableBuffer.hex(32, () => wp.hashSequence, v => wp.hashSequence = v),
      ComposableBuffer.hexBEBufferLE(32, () => wp.outpointTxId, v => wp.outpointTxId = v),
      ComposableBuffer.uInt32(() => wp.outpointIndex, v => wp.outpointIndex = v),
      ComposableBuffer.single<Script>(() => wp.scriptCode, v => wp.scriptCode = v, v => new CScript(v)),
      ComposableBuffer.satoshiAsBigNumber(() => wp.value, v => wp.value = v),
      ComposableBuffer.uInt32(() => wp.sequence, v => wp.sequence = v),
      ComposableBuffer.hex(32, () => wp.hashOutputs, v => wp.hashOutputs = v),
      ComposableBuffer.uInt32(() => wp.lockTime, v => wp.lockTime = v),
      ComposableBuffer.uInt32(() => wp.hashType, v => wp.hashType = v)
    ]
  }

  asBuffer (): Buffer {
    const buffer = new SmartBuffer()
    this.toBuffer(buffer)
    return buffer.toBuffer()
  }
}
