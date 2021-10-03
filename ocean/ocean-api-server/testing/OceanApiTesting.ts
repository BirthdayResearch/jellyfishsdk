import { Testing, TestingGroup } from '@defichain/jellyfish-testing'
import { OceanApiClient } from '@defichain/ocean-api-client'
import { StubServer } from './StubServer'
import { StubClient } from './StubClient'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ApiClient } from '@defichain/jellyfish-api-core'
import { NestFastifyApplication } from '@nestjs/platform-fastify'

export class OceanApiTesting {
  constructor (
    private readonly testingGroup: TestingGroup,
    private readonly stubServer: StubServer = new StubServer(testingGroup.get(0).container),
    private readonly stubApiClient: StubClient = new StubClient((stubServer))
  ) {
  }

  static create (testingGroup: TestingGroup = TestingGroup.create(1)): OceanApiTesting {
    return new OceanApiTesting(testingGroup)
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

  get client (): OceanApiClient {
    return this.stubApiClient
  }

  /**
   * Starts connected services for testing.
   *
   * @see TestingGroup
   * @see Testing
   * @see StubServer
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
   * @see StubServer
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
