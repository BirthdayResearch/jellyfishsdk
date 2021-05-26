import { Injectable, Logger } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MainIndexer } from '@src/module.indexer/model/_main'
import { Block, BlockMapper } from '@src/module.model/block'
import { IndexStatusMapper, Status } from '@src/module.indexer/status'

@Injectable()
export class Indexer {
  private readonly logger = new Logger(Indexer.name)
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
    if (this.indexing) {
      return
    }

    this.indexing = true // start indexing
    while (this.indexing) {
      try {
        await this.cleanup()
        this.indexing = await this.synchronize()
      } catch (err) {
        this.logger.error('failed exceptionally', err)
        this.indexing = false
      }
    }
  }

  close (): void {
    this.indexing = false
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

    if (await this.isBestChain(indexed)) {
      const highest = await this.client.blockchain.getBlockCount()
      const nextHeight = indexed.height + 1
      if (nextHeight > highest) {
        return false // won't attempt to index ahead
      }

      const nextHash = await this.client.blockchain.getBlockHash(nextHeight)
      await this.index(nextHash, nextHeight)
    } else {
      await this.invalidate(indexed.hash, indexed.height)
    }
    return true
  }

  private async isBestChain (indexed: Block): Promise<boolean> {
    const hash = await this.client.blockchain.getBlockHash(indexed.height)
    return hash === indexed.hash
  }

  private async indexGenesis (): Promise<boolean> {
    const hash = await this.client.blockchain.getBlockHash(0)
    await this.indexer.index(hash)
    // TODO(fuxingloh): to validate genesis hash across network
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

  private async index (hash: string, height: number): Promise<void> {
    this.logger.log(`Index - hash: ${hash} - height: ${height}`)
    await this.statusMapper.put(hash, height, Status.INDEXING)

    try {
      await this.indexer.index(hash)
      await this.statusMapper.put(hash, height, Status.INDEXED)
    } catch (err) {
      await this.statusMapper.put(hash, height, Status.ERROR)
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
