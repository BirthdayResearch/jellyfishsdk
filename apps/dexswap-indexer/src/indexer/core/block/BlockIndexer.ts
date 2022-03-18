import { Indexer } from '../RootIndexer'
import { blockchain as defid } from '@defichain/jellyfish-api-core'
import { Block, BlockMapper } from '../../../models/block/Block'
import { Injectable } from '@nestjs/common'

@Injectable()
export class BlockIndexer implements Indexer {
  constructor (
    private readonly blockService: BlockMapper
  ) {
  }

  async index (block: defid.Block<defid.Transaction>): Promise<void> {
    await this.blockService.put(createIndexedBlockFromDefidBlock(block))
  }

  async invalidate (block: Block): Promise<void> {
    await this.blockService.delete(block.id)
  }
}

function createIndexedBlockFromDefidBlock (block: defid.Block<defid.Transaction>): Block {
  return {
    id: block.hash,
    height: block.height,
    difficulty: block.difficulty,
    masternode: block.masternode,
    medianTime: block.mediantime,
    merkleroot: block.merkleroot,
    minter: block.minter,
    minterBlockCount: block.mintedBlocks,
    previousHash: block.previousblockhash,
    reward: block.tx[0].vout[0].value.toFixed(8),
    size: block.size,
    sizeStripped: block.strippedsize,
    stakeModifier: block.stakeModifier,
    time: block.time,
    transactionCount: block.nTx,
    version: block.version,
    weight: block.weight,
    txns: block.tx
  }
}
