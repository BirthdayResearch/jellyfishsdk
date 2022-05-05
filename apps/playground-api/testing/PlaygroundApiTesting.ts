import { TestingGroup } from '@defichain/jellyfish-testing'
import { PlaygroundApiClient } from '@defichain/playground-api-client'
import { PlaygroundStubServer } from './PlaygroundStubServer'
import { PlaygroundStubClient } from './PlaygroundStubClient'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { ApiTesting, PlaygroundOceanTestingGroup } from '../../libs/rootserver/testing/ApiTesting'

/**
 * PlaygroundApi Testing framework.
 */
export class PlaygroundApiTesting extends ApiTesting {
  playgroundTestingGroup = new PlaygroundOceanTestingGroup(this.testingGroup)
  constructor (
    private readonly testingGroup: TestingGroup = TestingGroup.create(1),
    readonly stubServer: PlaygroundStubServer = new PlaygroundStubServer(testingGroup.get(0).container),
    private readonly stubApiClient: PlaygroundStubClient = new PlaygroundStubClient((stubServer))
  ) {
    super()
  }

  static create (): PlaygroundApiTesting {
    return new PlaygroundApiTesting()
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
    await this.playgroundTestingGroup.group.start()
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
      await this.playgroundTestingGroup.group.stop()
    } catch (err) {
      console.error(err)
    }
  }
}
