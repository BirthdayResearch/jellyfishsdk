import { Injectable, Logger } from '@nestjs/common'
import { Indexer, RawBlock } from './_abstract'
import { Block, BlockMapper } from '../../module.model/block'

@Injectable()
export class BlockIndexer extends Indexer {
  private readonly logger = new Logger(BlockIndexer.name)
  constructor (private readonly mapper: BlockMapper) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    this.logger.log(`[Block] Index starting at block hash: ${block.hash} - height: ${block.height} - rawblock: ${JSON.stringify(block)}`)
    const reward = block.tx[0].vout[0].value.toFixed(8)
    await this.mapper.put(this.map(block, reward))
    this.logger.log(`[Block] Index ended for block hash: ${block.hash} - height: ${block.height} - rawblock: ${JSON.stringify(block)}`)
  }

  async invalidate (block: RawBlock): Promise<void> {
    this.logger.log(`[Block] Invalidate starting at block hash: ${block.hash} - height: ${block.height} - rawblock: ${JSON.stringify(block)}`)
    await this.mapper.delete(block.hash)
    this.logger.log(`[Block] Invalidate ended for block hash: ${block.hash} - height: ${block.height} - rawblock: ${JSON.stringify(block)}`)
  }

  map (block: RawBlock, reward: string): Block {
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
      weight: block.weight,
      reward: reward
    }
  }
}
