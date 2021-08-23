import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { MasternodeMapper } from '@src/module.model/masternode'

@Injectable()
export class BlockMintedIndexer extends Indexer {
  constructor (
    private readonly masternodeMapper: MasternodeMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const mn = await this.masternodeMapper.get(block.masternode)
    if (mn !== undefined && block.masternode !== undefined) {
      await this.masternodeMapper.put({ ...mn, mintedBlocks: mn.mintedBlocks + 1 })
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    const mn = await this.masternodeMapper.get(block.masternode)
    if (mn !== undefined && block.masternode !== undefined) {
      await this.masternodeMapper.put({ ...mn, mintedBlocks: mn.mintedBlocks - 1 })
    }
  }
}
