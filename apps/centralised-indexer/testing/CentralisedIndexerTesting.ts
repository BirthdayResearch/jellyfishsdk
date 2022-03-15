import { Testing, TestingGroup } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ApiClient } from '@defichain/jellyfish-api-core'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { CentralisedIndexerStubServer } from './CentralisedIndexerStubServer'
import { DynamoDbContainer } from './containers/DynamoDbContainer'

/**
 * Centralised Indexer testing framework. Contains the core components required for writing e2e tests.
 */
export class CentralisedIndexerTesting {
  constructor (
    private readonly testingGroup: TestingGroup,
    private readonly dynamoDbContainer: DynamoDbContainer = new DynamoDbContainer(),
    private readonly stubServer: CentralisedIndexerStubServer = new CentralisedIndexerStubServer(testingGroup.get(0).container, dynamoDbContainer)
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

  get app (): NestFastifyApplication {
    if (this.stubServer.app === undefined) {
      throw new Error('not yet initialized')
    }
    return this.stubServer.app
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
    await this.stubServer.start()
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
      await this.stubServer.stop()
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
