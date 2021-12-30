import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { RootModule } from '../src/modules/RootModule'
import { RootServer } from '../src'
import { ConfigModule, ConfigService } from '@nestjs/config'

/**
 * Service stubs are simulations of a real service, which are used for functional testing.
 * Configures a TestingModule that is configured to connect to a provided @defichain/testcontainers.
 */
export class StubServer extends RootServer {
  /**
   * @see PlaygroundModule
   */
  public playgroundEnable: boolean = false

  constructor (private readonly container: MasterNodeRegTestContainer) {
    super()
  }

  async create (): Promise<NestFastifyApplication> {
    const url = await this.container.getCachedRpcUrl()
    const module = await Test.createTestingModule({
      imports: [
        RootModule,
        ConfigModule.forFeature(() => {
          return {
            BLOCKCHAIN_CPP_URL: url,
            PLAYGROUND_ENABLE: this.playgroundEnable
          }
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
