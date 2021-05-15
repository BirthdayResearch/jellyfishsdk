import { Test, TestingModule } from '@nestjs/testing'
import { AppModule } from '@src/app.module'
import { ConfigService } from '@nestjs/config'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { newFastifyAdapter } from '@src/fastify'
import { NestFastifyApplication } from '@nestjs/platform-fastify'

/**
 * Configures an end-to-end testing app integrated with all modules.
 * Memory database will be used by default.
 * DeFiD client will be provided by @defichain/testcontainers.
 *
 * @param {MasterNodeRegTestContainer} container to provide defid client
 * @return Promise<NestFastifyApplication> with initialization
 */
export async function createTestingApp (container: MasterNodeRegTestContainer): Promise<NestFastifyApplication> {
  const url = await container.getCachedRpcUrl()
  const module = await createTestingModule(url)
  const app = module.createNestApplication<NestFastifyApplication>(
    newFastifyAdapter({
      logger: false
    })
  )
  await app.init()
  return app
}

async function createTestingModule (url: string): Promise<TestingModule> {
  return await Test.createTestingModule({
    imports: [AppModule.forRoot('memory')]
  })
    .overrideProvider(ConfigService).useValue(new TestConfigService(url))
    .compile()
}

/**
 * Override default ConfigService for E2E testing
 */
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
