import { TestingGroup } from '@defichain/jellyfish-testing'
import { OceanApiClient } from '@defichain/ocean-api-client'
import { OceanStubServer } from './OceanStubServer'
import { OceanStubClient } from './OceanStubClient'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { ApiTesting, PlaygroundOceanTestingGroup } from '../../libs/rootserver/testing/ApiTesting'

/**
 * OceanApi Testing framework.
 */
export class OceanApiTesting extends ApiTesting {
  oceanTestingGroup = new PlaygroundOceanTestingGroup(this.testingGroup)
  constructor (
    readonly testingGroup: TestingGroup = TestingGroup.create(1),
    readonly stubServer: OceanStubServer = new OceanStubServer(testingGroup.get(0).container),
    private readonly stubApiClient: OceanStubClient = new OceanStubClient((stubServer))
  ) {
    super()
  }

  static create (): OceanApiTesting {
    return new OceanApiTesting()
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
    await this.oceanTestingGroup.group.start()
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
      await this.oceanTestingGroup.group.stop()
    } catch (err) {
      console.error(err)
    }
  }
}
