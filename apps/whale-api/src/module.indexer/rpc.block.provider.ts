import { Injectable, Logger } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MainIndexer } from './model/_main'
import { Block, BlockMapper } from '../module.model/block'
import { IndexStatusMapper, Status } from './status'
import { waitForCondition } from '@defichain/testcontainers/dist/utils'
import { blockchain as defid, RpcApiError } from '@defichain/jellyfish-api-core'

@Injectable()
export class RPCBlockProvider {
  private readonly logger = new Logger(RPCBlockProvider.name)
  private running = false
  private indexing = false

  constructor (
    private readonly client: JsonRpcClient,
    private readonly blockMapper: BlockMapper,
    private readonly indexer: MainIndexer,
    private readonly statusMapper: IndexStatusMapper
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
        const status = await this.statusMapper.get()
        this.logger.log(`[Start Cycle] - status: ${JSON.stringify(status)}`)
        if (status?.status === Status.ERROR) {
          this.logger.log('Setting status mapper to previous block...')
          const currentBlock = await this.client.blockchain.getBlock(status.hash, 2)
          const prevBlock = await this.client.blockchain.getBlock(currentBlock.previousblockhash, 2)
          await this.statusMapper.put(prevBlock.hash, prevBlock.height, Status.INDEXING)
        }

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
    const indexed = await this.blockMapper.getHighest()
    if (indexed === undefined) {
      return await this.indexGenesis()
    }

    let nextHash: string
    try {
      nextHash = await this.client.blockchain.getBlockHash(indexed.height + 1)
    } catch (err) {
      if ((err as RpcApiError).payload.message === 'Block height out of range') {
        return false
      }
      throw err
    }

    const nextBlock = await this.client.blockchain.getBlock(nextHash, 2)
    if (await RPCBlockProvider.isBestChain(indexed, nextBlock)) {
      this.logger.log(`[Synchronize] BEST CHAIN. Indexing next block ${nextBlock.height}...`)
      await this.index(nextBlock)
    } else {
      this.logger.log(`[Synchronize] NOT BEST CHAIN. Indexing prev block ${indexed.height}...`)
      // Retry indexing the previous block before invalidating it
      const MAX_RETRIES = 3
      let prevBlockIndexedSuccessfully = false
      let prevBlockRetryCount = 0

      while (!prevBlockIndexedSuccessfully && prevBlockRetryCount < MAX_RETRIES) {
        try {
          this.logger.log(`Retrying indexing block ${indexed.height} - Attempt ${prevBlockRetryCount + 1}`)
          const previousBlock = await this.client.blockchain.getBlock(indexed.hash, 2)
          await this.index(previousBlock)
          prevBlockIndexedSuccessfully = true
        } catch (error) {
          this.logger.error(`Error indexing the previous block - ${indexed.height}`)
          prevBlockRetryCount++
        }
      }

      if (!prevBlockIndexedSuccessfully) {
        // If all retries for indexing the previous block fail, invalidate it
        await this.invalidate(indexed.hash, indexed.height)
        this.logger.error('All retries for indexing the previous block have failed. The block has been invalidated.')
      }
    }
    return true
  }

  /**
   * @param {Block} indexed previous block
   * @param {defid.Block<Transaction>} nextBlock to check previous block hash
   */
  private static async isBestChain (indexed: Block, nextBlock: defid.Block<defid.Transaction>): Promise<boolean> {
    return indexed.hash === nextBlock.previousblockhash
  }

  public async indexGenesis (): Promise<boolean> {
    const hash = await this.client.blockchain.getBlockHash(0)
    const block = await this.client.blockchain.getBlock(hash, 2)
    await this.indexer.index(block)
    return true
  }

  /**
   * Cleanup attempt to fix the index when DeFi whale failed exceptionally.
   */
  private async cleanup (): Promise<void> {
    const status = await this.statusMapper.get()
    if (status === undefined) {
      return
    }
    switch (status.status) {
      case Status.INVALIDATED:
      case Status.INDEXED:
        return
    }

    this.logger.log(`Cleanup - hash: ${status.hash} - height: ${status.height} - status: ${status.status}`)
    await this.invalidate(status.hash, status.height)
  }

  private async index (block: defid.Block<defid.Transaction>): Promise<void> {
    this.logger.log(`Index - hash: ${block.hash} - height: ${block.height}`)
    await this.statusMapper.put(block.hash, block.height, Status.INDEXING)

    try {
      await this.indexer.index(block)
      await this.statusMapper.put(block.hash, block.height, Status.INDEXED)
    } catch (err) {
      await this.statusMapper.put(block.hash, block.height, Status.ERROR)
      throw err
    }
  }

  private async invalidate (hash: string, height: number): Promise<void> {
    this.logger.log(`Invalidate - hash: ${hash} - height: ${height}`)
    await this.statusMapper.put(hash, height, Status.INVALIDATING)

    try {
      await this.indexer.invalidate(hash)
      await this.statusMapper.put(hash, height, Status.INVALIDATED)
    } catch (err) {
      await this.statusMapper.put(hash, height, Status.ERROR)
      throw err
    }
  }
}
