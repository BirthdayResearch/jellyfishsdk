import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { RootModule } from '../src/modules/RootModule'
import { PlaygroundApiServer } from '../src'
import { ConfigService } from '@nestjs/config'
import { newFastifyAdapter } from '../src/Fastify'

/**
 * Service stubs are simulations of a real service, which are used for functional testing.
 * Configures a TestingModule that is configured to connect to a provided @defichain/testcontainers.
 */
export class PlaygroundStubServer extends PlaygroundApiServer {
  constructor (private readonly container: MasterNodeRegTestContainer) {
    super()
  }

  async create (): Promise<NestFastifyApplication> {
    const url = await this.container.getCachedRpcUrl()
    const module = await Test.createTestingModule({
      imports: [
        RootModule
      ]
    })
      .overrideProvider(ConfigService).useValue(new TestConfigService(url))
      .compile()

    const adapter = newFastifyAdapter({
      logger: false
    })
    return module.createNestApplication<NestFastifyApplication>(adapter)
  }

  async init (app: NestFastifyApplication, config: ConfigService): Promise<void> {
    await app.init()
  }
}

/**
 * Override default ConfigService for E2E testing
 */
class TestConfigService extends ConfigService {
  constructor (rpcUrl: string) {
    super({
      BLOCKCHAIN_CPP_URL: rpcUrl,
      BLOCKCHAIN_CPP_LIVENESS_MAX_BLOCK_COUNT: 1000,
      BLOCKCHAIN_CPP_READINESS_MAX_BLOCK_COUNT: 20
    })
  }
}
