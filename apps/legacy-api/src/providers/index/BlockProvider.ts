import { Inject, Injectable, Logger } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { waitForCondition } from '@defichain/testcontainers'
import { ApiError, blockchain as defid } from '@defichain/jellyfish-api-core'
import { DexSwapQueue } from './DexSwapQueue'
import { WhaleApiClientProvider } from '../WhaleApiClientProvider'
import { SupportedNetwork } from '../../pipes/NetworkValidationPipe'

export type DeFiDBlock = defid.Block<defid.Transaction>

class BlockQueue {
  // [1, 2, 3, ...]
  private blocks: DeFiDBlock[] = []

  constructor (readonly cacheCount: number) {
  }

  get length (): number {
    return this.blocks.length
  }

  isFull (): boolean {
    return this.blocks.length >= this.cacheCount
  }

  enqueue (block: DeFiDBlock): void {
    if (this.blocks.find(b => b.hash === block.hash) !== undefined) {
      return
    }

    block.height = Number(block.height)
    this.blocks.push(block)
    this.blocks.sort((b1, b2) => {
      if (b1.height > b2.height) {
        return 1
      }
      if (b1.height < b2.height) {
        return -1
      }
      return 0
    })
  }

  dequeue (): DeFiDBlock {
    const head = this.blocks[0]
    this.blocks.shift()
    return head
  }

  getHighest (): DeFiDBlock {
    return this.blocks[this.blocks.length - 1]
  }

  getLowest (): DeFiDBlock {
    return this.blocks[0]
  }

  invalidate (hash: string): void {
    this.blocks = this.blocks.filter(block => block.hash !== hash)
  }

  toString (): string {
    let out = `BlockQueue[size=${this.length}`
    if (this.blocks.length >= 2) {
      out += `, blockHeights=[${this.blocks[0].height} ... ${this.blocks[this.blocks.length - 1].height}]]`
    } else {
      out += ']'
    }
    return out
  }
}

/**
 * Polls the blockchain and caches blocks in a queue
 */
@Injectable()
export class RPCBlockProvider {
  private readonly client
  private readonly logger = new Logger(RPCBlockProvider.name + ':' + this.network)
  private running = false
  private indexing = false

  private readonly concurrentRequests: number = 50
  private isNearTip: boolean = false

  blockQueue = new BlockQueue(this.cacheCount)

  constructor (
    @Inject('NETWORK') private readonly network: SupportedNetwork,
    @Inject('BLOCK_CACHE_COUNT') private readonly cacheCount: number,
    private readonly whaleApiClientProvider: WhaleApiClientProvider,
    private readonly blockListener: DexSwapQueue
  ) {
    this.client = whaleApiClientProvider.getClient(network)
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
        if (this.isNearTip) {
          this.indexing = await this.synchronize()
        } else {
          this.indexing = await this.concurrentCatchUp()
        }
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

  private async concurrentCatchUp (): Promise<boolean> {
    const client = this.whaleApiClientProvider.getClient(this.network)
    const chainHeight = (await client.stats.get()).count.blocks

    const promises: Function[] = []
    for (
      let height = chainHeight - this.cacheCount - 10;
      height < chainHeight - 10;
      height++
    ) {
      promises.push(async () => {
        await this.fetchAndCacheBlock(height)
      })
    }

    // Dispatch requests up to {concurrentRequests} limit
    let requests = 0
    while (promises.length > 0) {
      if (requests >= this.concurrentRequests) {
        await unblockEventLoop()
        continue
      }

      const promise = promises.shift()
      if (promise === undefined) {
        continue
      }

      requests++
      promise()
        .catch((err: Error) => {
          this.logger.error(err)
          promises.push(promise)
        })
        .finally(() => {
          requests--
        })
    }

    // If nearing chain height, then switch from concurrent to single linear sync
    // So that invalidation can be properly handled
    this.isNearTip = true
    this.logger.log(`Switching from concurrent sync to linear sync at height ${chainHeight - 10}`)

    return true
  }

  private async fetchAndCacheBlock (height: number): Promise<void> {
    const block = await this.getBlockAtHeight(height)
    await this.cacheBlockAndNotifyListener(block)
  }

  private async cacheBlockAndNotifyListener (block: DeFiDBlock): Promise<void> {
    // Dequeue blocks and invalidate them when queue is full
    if (this.blockQueue.isFull()) {
      const invalidatedBlock = this.blockQueue.dequeue()
      this.logger.log(`Dequeueing block ${invalidatedBlock.height}, hash=${invalidatedBlock.hash}`)
      await this.blockListener.invalidate(invalidatedBlock.hash)
    }

    await this.blockListener.onBlock(block)
    this.blockQueue.enqueue(block)
    this.logger.log(
      `Cached block ${block.height}, hash=${block.hash}. ` +
      `${this.blockQueue.toString()}`
    )
  }

  /**
   * Synchronize defid with index.
   * - Index must index all data successfully or fail exceptionally.
   * - Invalidate must invalidate all data successfully or fail exceptionally.
   * @return {boolean} whether there is any indexing activity
   */
  private async synchronize (): Promise<boolean> {
    const indexed = await this.blockQueue.getHighest()
    if (indexed === undefined) {
      return await this.indexFromChainTip(this.cacheCount)
    }

    let nextBlock
    try {
      nextBlock = await this.getBlockAtHeight(indexed.height + 1)
    } catch (err) {
      if ((err as ApiError).message.includes('Block height out of range')) {
        if (!this.blockListener.isReady) {
          this.blockListener.isReady = true
          this.logger.log('Indexer caught up with chain tip!')
        }
        return false
      }
      throw err
    }

    if (nextBlock === undefined) {
      throw new Error(`Unexpected error: could not get block at height ${indexed.height + 1}`)
    }

    if (await RPCBlockProvider.isBestChain(indexed, nextBlock)) {
      await this.cacheBlockAndNotifyListener(nextBlock)
    } else {
      await this.blockListener.invalidate(indexed.hash)

      this.blockQueue.invalidate(indexed.hash)
      this.logger.log(`Invalidated block ${indexed.height}, hash=${indexed.hash}`)
    }
    return true
  }

  private static async isBestChain (cached: DeFiDBlock, nextBlock: DeFiDBlock): Promise<boolean> {
    return nextBlock.previousblockhash === cached.hash
  }

  /**
   * Begin indexing at an offset from the current chain height
   * @param offset
   * @private
   */
  private async indexFromChainTip (offset: number): Promise<boolean> {
    const client = this.whaleApiClientProvider.getClient(this.network)

    const chainHeight = (await client.stats.get()).count.blocks
    const heightToIndex = Math.max(1, chainHeight - offset)

    const block = await this.getBlockAtHeight(heightToIndex)
    this.blockQueue.enqueue(block)
    return true
  }

  private async getBlockAtHeight (height: number): Promise<DeFiDBlock> {
    const blockHash = await this.client.rpc.call<string>('getblockhash', [height], 'number')
    const verbosity = 2
    return await this.client.rpc.call<DeFiDBlock>(
      'getblock',
      [blockHash, verbosity],
      'bignumber'
    )
  }
}

async function unblockEventLoop (): Promise<void> {
  return await new Promise((resolve: Function) => {
    setImmediate(() => resolve())
  })
}
