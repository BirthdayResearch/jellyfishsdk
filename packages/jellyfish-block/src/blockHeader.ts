import { BufferComposer, ComposableBuffer } from '@defichain/jellyfish-buffer'
import BigNumber from 'bignumber.js'

export interface BlockHeader {
  version: number // ------------| 4 bytes, block version number
  hashPrevBlock: string // ------| 32 bytes, 256-bit hash of the previous block header
  hashMerkleRoot: string // -----| 32 bytes, 256-bit hash based on all of the transactions in the block
  time: number // ---------------| 4 bytes, current block timestamp as unix timestamp
  bits: number // ---------------| 4 bytes, current target in compact format
  stakeModifier: string // ------| 32 bytes, deterministically random number used to make sure the stake hashes are not predictable.
  height: BigNumber // ----------| 8 bytes, block height
  mintedBlocks: BigNumber // ----| 8 bytes, minted block counter
  signature: string // ----------| n = VarUInt{1-9 bytes}, + n bytes
}

/**
 * Composable BlockHeader, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CBlockHeader extends ComposableBuffer<BlockHeader> {
  composers (bh: BlockHeader): BufferComposer[] {
    return [
      ComposableBuffer.uInt32(() => bh.version, v => bh.version = v),
      ComposableBuffer.hexBEBufferLE(32, () => bh.hashPrevBlock, v => bh.hashPrevBlock = v),
      ComposableBuffer.hexBEBufferLE(32, () => bh.hashMerkleRoot, v => bh.hashMerkleRoot = v),
      ComposableBuffer.uInt32(() => bh.time, v => bh.time = v),
      ComposableBuffer.uInt32(() => bh.bits, v => bh.bits = v),
      ComposableBuffer.hexBEBufferLE(32, () => bh.stakeModifier, v => bh.stakeModifier = v),
      ComposableBuffer.bigNumberUInt64(() => bh.height, v => bh.height = v),
      ComposableBuffer.bigNumberUInt64(() => bh.mintedBlocks, v => bh.mintedBlocks = v),
      ComposableBuffer.varUIntHex(() => bh.signature, v => bh.signature = v)
    ]
  }
}
