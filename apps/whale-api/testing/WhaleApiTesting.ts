import { Testing, TestingGroup } from '@defichain/jellyfish-testing'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { WhaleStubServer } from './WhaleStubServer'
import { WhaleStubClient } from './WhaleStubClient'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ApiClient } from '@defichain/jellyfish-api-core'
import { NestFastifyApplication } from '@nestjs/platform-fastify'

/**
 * WhaleApi Testing framework.
 */
export class WhaleApiTesting {
  constructor (
    private readonly testingGroup: TestingGroup,
    private readonly stubServer: WhaleStubServer = new WhaleStubServer(testingGroup.get(0).container),
    private readonly stubApiClient: WhaleStubClient = new WhaleStubClient((stubServer))
  ) {
  }

  static create (testingGroup: TestingGroup = TestingGroup.create(1)): WhaleApiTesting {
    return new WhaleApiTesting(testingGroup)
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

  get rpc (): ApiClient {
    return this.testing.rpc
  }

  get app (): NestFastifyApplication {
    if (this.stubServer.app === undefined) {
      throw new Error('not yet initialized')
    }
    return this.stubServer.app
  }

  get client (): WhaleApiClient {
    return this.stubApiClient
  }

  /**
   * Start connected services for testing.
   *
   * @see TestingGroup
   * @see Testing
   * @see WhaleStubServer
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
   * @see WhaleStubServer
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
