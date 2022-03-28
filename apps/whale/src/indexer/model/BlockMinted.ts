import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from './_abstract'
import { MasternodeMapper } from '../../model/Masternode'

@Injectable()
export class BlockMintedIndexer extends Indexer {
  constructor (
    private readonly masternodeMapper: MasternodeMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    if (block.masternode !== undefined) {
      const mn = await this.masternodeMapper.get(block.masternode)
      if (mn !== undefined) {
        await this.masternodeMapper.put({ ...mn, mintedBlocks: mn.mintedBlocks + 1 })
      }
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    if (block.masternode !== undefined) {
      const mn = await this.masternodeMapper.get(block.masternode)
      if (mn !== undefined) {
        await this.masternodeMapper.put({ ...mn, mintedBlocks: mn.mintedBlocks - 1 })
      }
    }
  }
}
