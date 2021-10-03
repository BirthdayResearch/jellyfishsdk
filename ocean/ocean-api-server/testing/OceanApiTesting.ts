import { Testing, TestingGroup } from '@defichain/jellyfish-testing'
import { OceanApiClient } from '@defichain/ocean-api-client'
import { StubServer } from './StubServer'
import { StubClient } from './StubClient'

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
