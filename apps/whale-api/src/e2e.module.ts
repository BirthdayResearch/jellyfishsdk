import { Test, TestingModule } from '@nestjs/testing'
import { AppModule } from '@src/app.module'
import { ConfigService } from '@nestjs/config'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { newFastifyAdapter } from '@src/fastify'
import { NestFastifyApplication } from '@nestjs/platform-fastify'

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

async function createTestingModule (url: string): Promise<TestingModule> {
  return await Test.createTestingModule({
    imports: [AppModule.forRoot('memory')]
  })
    .overrideProvider(ConfigService).useValue(new TestConfigService(url))
    .compile()
}

/**
 * Configures a TestingModule that is configured to connect to a provided @defichain/testcontainers.
 *
 * @param {MasterNodeRegTestContainer} container to connect TestingModule to
 * @return Promise<NestFastifyApplication> that is initialized
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
