import { Injectable, Logger } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { waitForCondition } from '@defichain/testcontainers'
import { ApiClient, blockchain as defid, RpcApiError } from '@defichain/jellyfish-api-core'
import { Block, BlockService } from '../../models/block/Block'
import { RootIndexer } from './RootIndexer'
import { TokenService } from '../../models/dftx/Token'

@Injectable()
export class RpcBlockProvider {
  private readonly logger = new Logger(RpcBlockProvider.name)
  private running = false
  private indexing = false

  constructor (
    private readonly client: ApiClient,
    private readonly blockService: BlockService,
    private readonly tokenService: TokenService,
    private readonly rootIndexer: RootIndexer
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
    const blockIdentifiers = await this.blockService.getHighestBlockIdentifiers()
    if (blockIdentifiers === undefined) {
      return await this.indexGenesis()
    }

    const { height, hash } = blockIdentifiers

    let nextHash: string
    try {
      nextHash = await this.client.blockchain.getBlockHash(height + 1)
    } catch (err) {
      if (err instanceof RpcApiError && err.payload.message === 'Block height out of range') {
        return false
      }
      throw err
    }

    const nextBlock = await this.client.blockchain.getBlock(nextHash, 2)
    if (await RpcBlockProvider.isBestChain(hash, nextBlock)) {
      await this.index(nextBlock)
    } else {
      const blockToInvalidate = await this.blockService.getHighest()
      if (blockToInvalidate !== undefined) {
        await this.invalidate(blockToInvalidate)
      }
    }
    return true
  }

  private static async isBestChain (lastIndexedHash: string, nextBlock: defid.Block<defid.Transaction>): Promise<boolean> {
    return nextBlock.previousblockhash === lastIndexedHash
  }

  public async indexGenesis (): Promise<boolean> {
    const hash = await this.client.blockchain.getBlockHash(0)
    const block = await this.client.blockchain.getBlock(hash, 2)
    await this.index(block)

    // Seed DFI token
    await this.tokenService.upsert({
      id: 0,
      symbol: 'DFI',
      name: 'Default Defi token',
      decimal: 8,
      limit: '0.00000000',
      isDAT: true,
      isLPS: false,
      tradeable: true,
      mintable: false,
      block: {
        hash: block.hash,
        height: 0,
        time: block.time,
        medianTime: block.mediantime
      }
    })

    return true
  }

  private async index (block: defid.Block<defid.Transaction>): Promise<void> {
    this.logger.log(`Index - hash: ${block.hash} - height: ${block.height}`)
    await this.rootIndexer.index(block)
  }

  private async invalidate (block: Block): Promise<void> {
    await this.rootIndexer.invalidate(block)
  }

  private async cleanup (): Promise<void> {
    // TODO(eli-lim)
  }
}
