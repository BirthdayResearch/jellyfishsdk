import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { ServiceModule } from './ServiceModule'

export class CentralisedApiServer {
  app?: NestFastifyApplication

  async create (): Promise<NestFastifyApplication> {
    const adapter = new FastifyAdapter()
    return await NestFactory.create<NestFastifyApplication>(ServiceModule, adapter)
  }

  async configure (app: NestFastifyApplication, config: ConfigService): Promise<void> {
    app.enableCors({
      origin: '*',
      methods: ['GET', 'PUT', 'POST', 'DELETE'],
      allowedHeaders: ['Content-Type'],
      maxAge: 60 * 24 * 7
    })

    // TODO(eli-lim):
    // const version = config.get<string>('API_VERSION') as string
    // const network = config.get<string>('NETWORK') as string
    // app.setGlobalPrefix(`${version}/${network}`, {
    //   exclude: [
    //     '/_actuator/probes/liveness',
    //     '/_actuator/probes/readiness'
    //   ]
    // })
  }

  async init (app: NestFastifyApplication, config: ConfigService): Promise<void> {
    const port = config.get<number>('PORT', 3001)
    await app.listen(port, '0.0.0.0')
  }

  async start (): Promise<void> {
    this.app = await this.create()
    const config = this.app.get(ConfigService)

    await this.configure(this.app, config)
    await this.init(this.app, config)
  }

  async stop (): Promise<void> {
    await this.app?.close()
  }
}

/**
 * Bootstrap RootModule and start server
 */
if (require.main === module) {
  void new CentralisedApiServer().start()
}
