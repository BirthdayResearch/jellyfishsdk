import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { RootModule } from '../src/modules/RootModule'
import { RootServer } from '../src'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { StartedTestContainer } from 'testcontainers'

/**
 * Service stubs are simulations of a real service, which are used for functional testing.
 * Configures a TestingModule that is configured to connect to a provided @defichain/testcontainers.
 */
export class RichListStubServer extends RootServer {
  constructor (private readonly container: MasterNodeRegTestContainer, private readonly postgres: StartedTestContainer) {
    super()
  }

  async create (): Promise<NestFastifyApplication> {
    const url = await this.container.getCachedRpcUrl()
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forFeature(() => {
          return {
            BLOCKCHAIN_CPP_URL: url,
            POSTGRES_HOST: 'localhost',
            POSTGRES_PORT: this.postgres.getMappedPort(5432).toString(),
            POSTGRES_USER: 'test',
            POSTGRES_PASS: 'test',
            POSTGRES_DB: 'riche2e'
          }
        }),
        RootModule
      ]
    }).compile()

    const adapter = new FastifyAdapter({ logger: false })

    return module.createNestApplication<NestFastifyApplication>(adapter)
  }

  async init (app: NestFastifyApplication, config: ConfigService): Promise<void> {
    await app.init()
  }
}
