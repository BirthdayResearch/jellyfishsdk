import { Injectable, Logger } from '@nestjs/common'
import { Indexer, RawBlock } from './_abstract'
import { MasternodeMapper } from '../../module.model/masternode'

@Injectable()
export class BlockMintedIndexer extends Indexer {
  private readonly logger = new Logger(BlockMintedIndexer.name)
  constructor (
    private readonly masternodeMapper: MasternodeMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    this.logger.log(`[Block.Minted] Index starting at block hash: ${block.hash} - height: ${block.height} - rawblock: ${JSON.stringify(block)}`)
    if (block.masternode !== undefined) {
      const mn = await this.masternodeMapper.get(block.masternode)
      if (mn !== undefined) {
        await this.masternodeMapper.put({ ...mn, mintedBlocks: mn.mintedBlocks + 1 })
      }
    }
    this.logger.log(`[Block.Minted] Index ended for block hash: ${block.hash} - height: ${block.height} - rawblock: ${JSON.stringify(block)}`)
  }

  async invalidate (block: RawBlock): Promise<void> {
    this.logger.log(`[Block.Minted] Invalidate starting at block hash: ${block.hash} - height: ${block.height} - rawblock: ${JSON.stringify(block)}`)
    if (block.masternode !== undefined) {
      const mn = await this.masternodeMapper.get(block.masternode)
      if (mn !== undefined) {
        await this.masternodeMapper.put({ ...mn, mintedBlocks: mn.mintedBlocks - 1 })
      }
    }
    this.logger.log(`[Block.Minted] Invalidate ended for block hash: ${block.hash} - height: ${block.height} - rawblock: ${JSON.stringify(block)}`)
  }
}
