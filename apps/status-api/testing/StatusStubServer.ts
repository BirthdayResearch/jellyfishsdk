import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { RootModule } from '../src/modules/RootModule'
import { RootServer } from '../src'
import { ConfigModule, ConfigService } from '@nestjs/config'

/**
 * Service stubs are simulations of a real service, which are used for functional testing.
 */
export class StatusStubServer extends RootServer {
  private readonly allRoutes: RegisteredRoute[] = []

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
    const app = module.createNestApplication<NestFastifyApplication>(adapter)
    this.recordAllRegisteredRoutes(app)
    return app
  }

  async init (app: NestFastifyApplication, config: ConfigService): Promise<void> {
    await app.init()
  }

  /**
   * Helper to get all the registered routes for testing purposes
   */
  getAllRoutes (): RegisteredRoute[] {
    return this.allRoutes
  }

  private recordAllRegisteredRoutes (app: NestFastifyApplication): void {
    app.getHttpAdapter()
      .getInstance()
      .addHook('onRoute', (opts: RegisteredRoute) => {
        this.allRoutes.push(opts)
      })
  }
}

/**
 * @see https://www.fastify.io/docs/latest/Reference/Hooks/#onroute
 */
export interface RegisteredRoute {
  method: string
  url: string // the complete URL of the route, it will include the prefix if any
  path: string // `url` alias
  routePath: string // the URL of the route without the prefix
  prefix: string
}
