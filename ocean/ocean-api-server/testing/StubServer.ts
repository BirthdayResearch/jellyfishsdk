import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { RootModule } from '../src/modules/RootModule'
import { RootServer } from '@defichain/ocean-api-server'
import { ConfigModule, ConfigService } from '@nestjs/config'

/**
 * Service stubs are simulations of a real service, which are used for functional testing.
 * Configures a TestingModule that is configured to connect to a provided @defichain/testcontainers.
 */
export class StubServer extends RootServer {
  constructor (private readonly container: MasterNodeRegTestContainer) {
    super()
  }

  async create (): Promise<NestFastifyApplication> {
    const url = await this.container.getCachedRpcUrl()
    const module = await Test.createTestingModule({
      imports: [
        RootModule,
        ConfigModule.forFeature(() => {
          return { FULL_NODE_URL: url }
        })
      ]
    }).compile()

    const adapter = new FastifyAdapter({
      logger: false
    })
    return module.createNestApplication<NestFastifyApplication>(adapter)
  }

  async init (app: NestFastifyApplication, config: ConfigService): Promise<void> {
    await app.init()
  }
}
