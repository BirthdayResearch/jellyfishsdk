import { RootModule } from './modules/RootModule'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { RootServer } from '@defichain-apps/libs/rootserver'

export class RichListApiServer extends RootServer {
  async create (): Promise<NestFastifyApplication> {
    return await NestFactory.create<NestFastifyApplication>(RootModule, this.adapter)
  }

  async configure (app: NestFastifyApplication, config: ConfigService): Promise<void> {
    const version = config.get<string>('API_VERSION') as string
    const network = config.get<string>('API_NETWORK') as string

    app.enableCors({
      origin: '*',
      methods: ['GET', 'PUT', 'POST', 'DELETE'],
      allowedHeaders: ['Content-Type'],
      maxAge: 60 * 24 * 7
    })

    app.setGlobalPrefix(`${version}/${network}`, {
      exclude: [
        '/_actuator/probes/liveness',
        '/_actuator/probes/readiness'
      ]
    })
  }

  async init (app: NestFastifyApplication, config: ConfigService): Promise<void> {
    const port = config.get<number>('PORT', 3000)
    await app.listen(port, '0.0.0.0')
  }
}

/**
 * Bootstrap RootModule and start server
 */
if (require.main === module) {
  void new RichListApiServer().start()
}
