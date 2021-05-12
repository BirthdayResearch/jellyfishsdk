import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { Block, BlockMapper } from '@src/module.model/block'

@Injectable()
export class BlockIndexer extends Indexer {
  constructor (private readonly mapper: BlockMapper) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    await this.mapper.put(this.map(block))
  }

  async invalidate (block: RawBlock): Promise<void> {
    await this.mapper.delete(block.hash)
  }

  map (block: RawBlock): Block {
    return {
      id: block.hash,
      hash: block.hash,
      previousHash: block.previousblockhash,
      height: block.height,
      version: block.version,
      time: block.time,
      medianTime: block.mediantime,
      transactionCount: block.tx.length,
      difficulty: block.difficulty,
      masternode: block.masternode,
      minter: block.minter,
      minterBlockCount: block.mintedBlocks,
      stakeModifier: block.stakeModifier,
      merkleroot: block.merkleroot,
      size: block.size,
      sizeStripped: block.strippedsize,
      weight: block.weight
    }
  }
}
