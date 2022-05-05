import { Testing, TestingGroup } from '@defichain/jellyfish-testing'
import { OceanApiClient } from '@defichain/ocean-api-client'
import { OceanStubServer } from './OceanStubServer'
import { OceanStubClient } from './OceanStubClient'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { ApiTesting } from '../../libs/rootserver/testing/ApiTesting'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ApiClient } from '@defichain/jellyfish-api-core'

/**
 * OceanApi Testing framework.
 */
export class OceanApiTesting extends ApiTesting {
  constructor (
    readonly testingGroup: TestingGroup,
    readonly stubServer: OceanStubServer = new OceanStubServer(testingGroup.get(0).container),
    private readonly stubApiClient: OceanStubClient = new OceanStubClient((stubServer))
  ) {
    super()
  }

  static create (testingGroup: TestingGroup = TestingGroup.create(1)): OceanApiTesting {
    return new OceanApiTesting(testingGroup)
  }

  get app (): NestFastifyApplication {
    if (this.stubServer.app === undefined) {
      throw new Error('not yet initialized')
    }
    return this.stubServer.app
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
    await super.start()
  }

  /**
   * Stop all connected services.
   *
   * @see TestingGroup
   * @see Testing
   * @see OceanStubServer
   */
  async stop (): Promise<void> {
    await super.stop()
    try {
      await this.group.stop()
    } catch (err) {
      console.error(err)
    }
  }
}
