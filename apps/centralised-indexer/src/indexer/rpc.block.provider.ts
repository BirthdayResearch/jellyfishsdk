import { Injectable, Logger } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { waitForCondition } from '@defichain/testcontainers'
import { blockchain as defid, RpcApiError } from '@defichain/jellyfish-api-core'
import { Block, BlockService } from '../models/block'

@Injectable()
export class RPCBlockProvider {
  private readonly logger = new Logger(RPCBlockProvider.name)
  private running = false
  private indexing = false

  constructor (
    private readonly client: JsonRpcClient,
    private readonly blockService: BlockService
  ) {
  }

  /**
   * Automatic indexer that cycle every 1000ms. If it is already indexing,
   * it will exit cycle immediately or else it will keep cycling.
   * NodeJS run it a single thread, hence the thread safety.
   */
  @Interval(1000)
  async cycle (): Promise<void> {
    if (!this.running) {
      return
    }

    if (this.indexing) {
      return
    }

    this.indexing = true // start indexing
    while (this.indexing) {
      if (!this.running) {
        this.indexing = false
        return
      }

      try {
        await this.cleanup()
        this.indexing = await this.synchronize()
      } catch (err) {
        this.logger.error('failed exceptionally', err)
        this.indexing = false
      }
    }
  }

  async start (): Promise<void> {
    this.running = true
  }

  async stop (): Promise<void> {
    this.running = false
    await waitForCondition(async () => {
      return !this.indexing
    }, 30000, 1000)
  }

  /**
   * Synchronize defid with index.
   * - Index must index all data successfully or fail exceptionally.
   * - Invalidate must invalidate all data successfully or fail exceptionally.
   * @return {boolean} whether there is any indexing activity
   */
  private async synchronize (): Promise<boolean> {
    const indexed = await this.blockService.getHighest()
    if (indexed === undefined) {
      return await this.indexGenesis()
    }

    let nextHash: string
    try {
      nextHash = await this.client.blockchain.getBlockHash(indexed.height + 1)
    } catch (err) {
      if (err instanceof RpcApiError && err.payload.message === 'Block height out of range') {
        return false
      }
      throw err
    }

    const nextBlock = await this.client.blockchain.getBlock(nextHash, 2)
    if (await RPCBlockProvider.isBestChain(indexed, nextBlock)) {
      await this.index(nextBlock)
    } else {
      await this.invalidate(indexed.hash, indexed.height)
    }
    return true
  }

  /**
   * @param {Block} indexed previous block
   * @param {defid.Block<Transaction>} nextBlock to check previous block hash
   */
  private static async isBestChain (indexed: Block, nextBlock: defid.Block<defid.Transaction>): Promise<boolean> {
    return nextBlock.previousblockhash === indexed.hash
  }

  public async indexGenesis (): Promise<boolean> {
    const hash = await this.client.blockchain.getBlockHash(0)
    const block = await this.client.blockchain.getBlock(hash, 2)
    console.log('indexing genesis', block.hash)
    await this.index(block)
    return true
  }

  private async index (block: defid.Block<defid.Transaction>): Promise<void> {
    this.logger.log(`Index - hash: ${block.hash} - height: ${block.height}`)
    // TODO(eli-lim): Delegate to other async indexers
    await this.blockService.upsert(createIndexedBlockFromDefidBlock(block))
  }

  private async invalidate (hash: string, height: number): Promise<void> {
    // TODO(eli-lim)
  }

  private async cleanup (): Promise<void> {
    // TODO(eli-lim)
  }
}

export function createIndexedBlockFromDefidBlock (block: defid.Block<defid.Transaction>): Block {
  return {
    hash: block.hash,
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
    weight: block.weight
  }
}
