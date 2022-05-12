import { Testing, TestingGroup } from '@defichain/jellyfish-testing'
import { PlaygroundApiClient } from '@defichain/playground-api-client'
import { PlaygroundStubServer } from './PlaygroundStubServer'
import { PlaygroundStubClient } from './PlaygroundStubClient'
import { ApiTesting } from '../../libs/rootserver/testing/ApiTesting'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ApiClient } from '@defichain/jellyfish-api-core'

/**
 * PlaygroundApi Testing framework.
 */
export class PlaygroundApiTesting extends ApiTesting {
  constructor (
    private readonly testingGroup: TestingGroup,
    protected readonly stubServer: PlaygroundStubServer = new PlaygroundStubServer(testingGroup.get(0).container),
    private readonly stubApiClient: PlaygroundStubClient = new PlaygroundStubClient((stubServer))
  ) {
    super()
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

  get rpc (): ApiClient {
    return this.testing.rpc
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
    await super.start()
  }

  /**
   * Stop all connected services.
   *
   * @see TestingGroup
   * @see Testing
   * @see PlaygroundStubServer
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
