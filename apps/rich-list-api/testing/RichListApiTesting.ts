import { Testing, TestingGroup } from '@defichain/jellyfish-testing'
import { RichListStubServer } from './RichListStubServer'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ApiClient } from '@defichain/jellyfish-api-core'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { GenericContainer, StartedTestContainer } from 'testcontainers'

/**
 * RichListApi Testing framework.
 */
export class RichListApiTesting {
  constructor (
    private readonly testingGroup: TestingGroup,
    private readonly postgres: StartedTestContainer,
    private readonly stubServer: RichListStubServer = new RichListStubServer(testingGroup.get(0).container, postgres)
  ) {
  }

  static async create (testingGroup: TestingGroup = TestingGroup.create(1)): Promise<RichListApiTesting> {
    const postgres = await new GenericContainer('postgres:14')
      .withName('richdb')
      .withEnv('POSTGRES_USER', 'test')
      .withEnv('POSTGRES_PASSWORD', 'test')
      .withEnv('POSTGRES_DB', 'riche2e')
      .withExposedPorts(5432)
      .withTmpFs({ '/temp_pgdata': 'rw,noexec,nosuid,size=65536k' })
      .start()
    return new RichListApiTesting(testingGroup, postgres)
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

  get db (): StartedTestContainer {
    return this.postgres
  }

  /**
   * Start connected services for testing.
   *
   * @see TestingGroup
   * @see Testing
   * @see RichListStubServer
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
   * @see RichListStubServer
   */
  async stop (): Promise<void> {
    try {
      await this.stubServer.stop()
    } catch (err) {
      console.error(err)
    }
    try {
      await this.postgres.stop()
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
