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
        this.logger.log(`[Cycle] - status: ${JSON.stringify(status)}`)
        if (status?.status === Status.ERROR && status.height === 1541254) {
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
    const status = await this.statusMapper.get()
    this.logger.log(`[Synchronize] - status: ${JSON.stringify(status)} - indexed: ${JSON.stringify(indexed)}`)
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
    const prevBlockHash = nextBlock.previousblockhash
    this.logger.log(`[Synchronize] - status: ${JSON.stringify(status)} - nextBlock: ${JSON.stringify(nextBlock)} - prevBlockHash: ${prevBlockHash}`)
    if (await RPCBlockProvider.isBestChain(indexed, nextBlock)) {
      this.logger.log(`[Synchronize] BEST CHAIN. Index... - status: ${JSON.stringify(status)} - nextBlock: ${JSON.stringify(nextBlock)} - prevBlockHash: ${prevBlockHash}`)
      await this.index(nextBlock)
    } else {
      this.logger.log(`[Synchronize] NOT BEST CHAIN. Invalidate... - status: ${JSON.stringify(status)} - indexedBlock: ${JSON.stringify(this.index)}`)
      if (nextBlock.height === 1541254) {
        this.logger.log('RETRY INDEXING FOR PREVIOUS BLOCK..')
        const prevBlock = await this.client.blockchain.getBlock(prevBlockHash, 2)
        this.logger.log(`RETRY INDEXING FOR PREVIOUS BLOCK ${JSON.stringify(prevBlock)}`)
        await this.index(prevBlock)
      }

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
