import { Testing, TestingGroup } from '@defichain/jellyfish-testing'
import { PlaygroundApiClient } from '@defichain/playground-api-client'
import { PlaygroundStubServer } from './PlaygroundStubServer'
import { PlaygroundStubClient } from './PlaygroundStubClient'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { NestFastifyApplication } from '@nestjs/platform-fastify'

/**
 * PlaygroundApi Testing framework.
 */
export class PlaygroundApiTesting {
  constructor (
    private readonly testingGroup: TestingGroup,
    private readonly stubServer: PlaygroundStubServer = new PlaygroundStubServer(testingGroup.get(0).container),
    private readonly stubApiClient: PlaygroundStubClient = new PlaygroundStubClient((stubServer))
  ) {
  }

  static create (testingGroup: TestingGroup = TestingGroup.create(1)): PlaygroundApiTesting {
    return new PlaygroundApiTesting(testingGroup)
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

  get rpc (): JsonRpcClient {
    return this.testing.rpc
  }

  get app (): NestFastifyApplication {
    if (this.stubServer.app === undefined) {
      throw new Error('not yet initialized')
    }
    return this.stubServer.app
  }

  get client (): PlaygroundApiClient {
    return this.stubApiClient
  }

  /**
   * Start connected services for testing.
   *
   * @see TestingGroup
   * @see Testing
   * @see PlaygroundStubServer
   */
  async start (): Promise<void> {
    await this.group.start()
    await this.stubServer.start()
  }

  /**
   * Stop all connected services.
   *
   * @see TestingGroup
   * @see Testing
   * @see PlaygroundStubServer
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
  }
}
