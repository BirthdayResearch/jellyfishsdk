import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { RootModule } from '../src/modules/RootModule'
import { RootServer } from '../src'
import { ConfigModule, ConfigService } from '@nestjs/config'

/**
 * Service stubs are simulations of a real service, which are used for functional testing.
 */
export class LegacyStubServer extends RootServer {
  async create (): Promise<NestFastifyApplication> {
    const module = await Test.createTestingModule({
      imports: [
        RootModule,
        ConfigModule.forFeature(() => {
          return {}
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
