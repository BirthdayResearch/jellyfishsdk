import { AppModule } from '@src/app.module'
import { newFastifyAdapter } from '@src/fastify'
import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'

class TestConfigService extends ConfigService {
  constructor (rpcUrl: string) {
    super({
      defid: {
        url: rpcUrl
      },
      network: 'regtest',
      database: {
        provider: 'memory'
      }
    })
  }
}

async function createTestingModule (container: MasterNodeRegTestContainer): Promise<TestingModule> {
  const url = await container.getCachedRpcUrl()

  const builder = Test.createTestingModule({
    // always default to memory module for e2e testing
    imports: [AppModule.forRoot('memory')]
  })

  return await builder
    .overrideProvider(ConfigService).useValue(new TestConfigService(url))
    .compile()
}

/**
 * Service stubs are simulations of a real service, which are used for functional testing.
 * Configures a TestingModule that is configured to connect to a provided @defichain/testcontainers.
 */
export class StubService {
  app?: NestFastifyApplication

  constructor (readonly container: MasterNodeRegTestContainer) {
  }

  async start (): Promise<void> {
    const module = await createTestingModule(this.container)
    this.app = module.createNestApplication<NestFastifyApplication>(
      newFastifyAdapter({
        logger: false
      })
    )
    await this.app?.init()
  }

  async stop (): Promise<void> {
    this.app?.close()
  }
}
