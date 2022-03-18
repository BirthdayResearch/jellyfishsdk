import { Testing, TestingGroup } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ApiClient } from '@defichain/jellyfish-api-core'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { DexSwapIndexerStubServer } from './DexSwapIndexerStubServer'
import { DynamoDbContainer } from './containers/DynamoDbContainer'

/**
 * DexSwap Indexer testing framework. Contains the core components required for writing e2e tests.
 */
export class DexSwapIndexerTesting {
  constructor (
    private readonly testingGroup: TestingGroup,
    private readonly dynamoDbContainer: DynamoDbContainer = new DynamoDbContainer(),
    private readonly indexerStubServer: DexSwapIndexerStubServer = new DexSwapIndexerStubServer(testingGroup.get(0).container, dynamoDbContainer)
  ) {
  }

  static create (testingGroup: TestingGroup = TestingGroup.create(1)): DexSwapIndexerTesting {
    return new DexSwapIndexerTesting(testingGroup)
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

  /**
   * Start connected services for testing.
   *
   * @see TestingGroup
   * @see Testing
   * @see DexSwapIndexerStubServer
   */
  async start (): Promise<void> {
    await Promise.all([
      await this.group.start(),
      await this.dynamoDbContainer.start()
    ])
    await this.indexerStubServer.start()
  }

  /**
   * Stop all connected services.
   *
   * @see TestingGroup
   * @see Testing
   * @see DexSwapIndexerStubServer
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
  }
}
