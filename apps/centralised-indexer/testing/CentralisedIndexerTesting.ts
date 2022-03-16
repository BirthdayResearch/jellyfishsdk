import { Testing, TestingGroup } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ApiClient } from '@defichain/jellyfish-api-core'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { CentralisedIndexerStubServer } from './CentralisedIndexerStubServer'
import { DynamoDbContainer } from './containers/DynamoDbContainer'
import waitForExpect from 'wait-for-expect'
import { BlockService } from '../src/models/block/Block'
import { CentralisedApiStubServer } from './CentralisedApiStubServer'

/**
 * Centralised Indexer testing framework. Contains the core components required for writing e2e tests.
 */
export class CentralisedIndexerTesting {
  constructor (
    private readonly testingGroup: TestingGroup,
    private readonly dynamoDbContainer: DynamoDbContainer = new DynamoDbContainer(),
    private readonly indexerStubServer: CentralisedIndexerStubServer = new CentralisedIndexerStubServer(testingGroup.get(0).container, dynamoDbContainer),
    private readonly apiStubServer: CentralisedApiStubServer = new CentralisedApiStubServer(dynamoDbContainer)
  ) {
  }

  static create (testingGroup: TestingGroup = TestingGroup.create(1)): CentralisedIndexerTesting {
    return new CentralisedIndexerTesting(testingGroup)
  }

  get group (): TestingGroup {
    return this.testingGroup
  }

  get testing (): Testing {
    return this.testingGroup.get(0)
  }

  get container (): MasterNodeRegTestContainer {
    return this.testing.container
  }

  get dbContainer (): DynamoDbContainer {
    return this.dynamoDbContainer
  }

  get rpc (): ApiClient {
    return this.testing.rpc
  }

  get indexerApp (): NestFastifyApplication {
    if (this.indexerStubServer.app === undefined) {
      throw new Error('not yet initialized')
    }
    return this.indexerStubServer.app
  }

  get apiApp (): NestFastifyApplication {
    if (this.apiStubServer.app === undefined) {
      throw new Error('not yet initialized')
    }
    return this.apiStubServer.app
  }

  /**
   * Start connected services for testing.
   *
   * @see TestingGroup
   * @see Testing
   * @see CentralisedIndexerStubServer
   */
  async start (): Promise<void> {
    await Promise.all([
      await this.group.start(),
      await this.dynamoDbContainer.start()
    ])
    await this.indexerStubServer.start()
    await this.apiStubServer.start()
  }

  /**
   * Stop all connected services.
   *
   * @see TestingGroup
   * @see Testing
   * @see CentralisedIndexerStubServer
   */
  async stop (): Promise<void> {
    try {
      await this.indexerStubServer.stop()
    } catch (err) {
      console.error(err)
    }
    try {
      await this.group.stop()
    } catch (err) {
      console.error(err)
    }
    try {
      await this.dynamoDbContainer.stop()
    } catch (err) {
      console.error(err)
    }
    try {
      await this.apiStubServer.stop()
    } catch (err) {
      console.error(err)
    }
  }

  /**
   * Helper to invalidate blocks from a given height onwards. Commonly used for testing
   * the indexers' invalidation logic.
   * @param {number} invalidateHeight the height from which blocks should be invalidated
   */
  async invalidateFromHeight (invalidateHeight: number): Promise<void> {
    if (this.indexerStubServer.app === undefined) {
      throw new Error('Indexer nest app not yet started!')
    }

    const height = await this.container.call('getblockcount')
    const highestHash = await this.container.call('getblockhash', [height])
    const invalidateBlockHash = await this.container.call('getblockhash', [invalidateHeight])
    await this.container.call('invalidateblock', [invalidateBlockHash])
    await this.container.call('clearmempool')
    // +1 more so that RPCBlockProvider.synchronize can update to next block.
    // New behavior where RPCBlockProvider won't invalidate block on the same height as itself
    await this.container.generate(height - invalidateHeight + 2)

    const blockService = this.indexerStubServer.app.get(BlockService)
    await waitForExpect(async () => {
      const block = await blockService.getByHeight(height)
      expect(block).not.toStrictEqual(undefined)
      expect(block?.hash).not.toStrictEqual(highestHash)
    }, 30000)
  }

  async waitForIndexedHeight (height: number, timeout: number = 30000): Promise<void> {
    const blockService = this.indexerApp.get(BlockService)
    await waitForExpect(async () => {
      const block = await blockService.getHighest()
      await expect(block?.height).toBeGreaterThanOrEqual(height)
    }, timeout)
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}
