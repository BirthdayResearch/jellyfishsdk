import { Testing, TestingGroup } from '@defichain/jellyfish-testing'
import { OceanApiClient } from '@defichain/ocean-api-client'
import { OceanStubServer } from './OceanStubServer'
import { OceanStubClient } from './OceanStubClient'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ApiClient } from '@defichain/jellyfish-api-core'
import { NestFastifyApplication } from '@nestjs/platform-fastify'

/**
 * OceanApi Testing framework.
 */
export class OceanApiTesting {
  constructor (
    private readonly testingGroup: TestingGroup,
    private readonly stubServer: OceanStubServer = new OceanStubServer(testingGroup.get(0).container),
    private readonly stubApiClient: OceanStubClient = new OceanStubClient((stubServer))
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
   * @param {boolean} bool to enable PlaygroundModule for OceanApiTest
   * @see PlaygroundModule
   */
  playgroundEnable (bool: boolean): void {
    this.stubServer.playgroundEnable = bool
  }

  /**
   * Start connected services for testing.
   *
   * @see TestingGroup
   * @see Testing
   * @see OceanStubServer
   */
  async start (): Promise<void> {
    await this.group.start()
    await this.group.get(0).container.waitForWalletCoinbaseMaturity()
    await this.stubServer.start()
  }

  /**
   * Stop all connected services.
   *
   * @see TestingGroup
   * @see Testing
   * @see OceanStubServer
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
