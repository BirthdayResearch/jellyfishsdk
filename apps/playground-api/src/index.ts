import { RootModule } from './modules/RootModule'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { RootServer } from '@defichain-apps/libs/rootserver'

export class PlaygroundApiServer extends RootServer {
  async create (): Promise<NestFastifyApplication> {
    return await NestFactory.create<NestFastifyApplication>(RootModule, this.adapter)
  }

  async configure (app: NestFastifyApplication, config: ConfigService): Promise<void> {
    app.enableCors({
      origin: '*',
      methods: ['GET', 'PUT', 'POST', 'DELETE'],
      allowedHeaders: ['Content-Type'],
      maxAge: 60 * 24 * 7
    })
  }

  async init (app: NestFastifyApplication, config: ConfigService): Promise<void> {
    await app.listen(process.env.PORT ?? '3000', '0.0.0.0')
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
  void new PlaygroundApiServer().start()
}
