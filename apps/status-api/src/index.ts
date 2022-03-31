import { RootModule } from './modules/RootModule'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { NestFactory } from '@nestjs/core'
import { RootServer } from '@defichain-apps/libs/rootserver'

export class StatusApiServer extends RootServer {
  app?: NestFastifyApplication

  async create (): Promise<NestFastifyApplication> {
    const adapter = new FastifyAdapter({ logger: true })
    return await NestFactory.create<NestFastifyApplication>(RootModule, adapter)
  }

  async configure (app: NestFastifyApplication): Promise<void> {
    app.enableCors({
      origin: '*',
      methods: ['GET'],
      allowedHeaders: ['Content-Type'],
      maxAge: 60 * 24 * 7
    })
  }
}

/**
 * Bootstrap RootModule and start server
 */
if (require.main === module) {
  void new StatusApiServer().start()
}
