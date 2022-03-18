import { IndexerModule } from './IndexerModule'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'

export class RootServer {
  app?: NestFastifyApplication

  async create (): Promise<NestFastifyApplication> {
    const adapter = new FastifyAdapter()
    return await NestFactory.create<NestFastifyApplication>(IndexerModule, adapter)
  }

  async init (app: NestFastifyApplication, config: ConfigService): Promise<void> {
    const port = config.get<number>('PORT', 3000)
    await app.listen(port, '0.0.0.0')
  }

  async start (): Promise<void> {
    this.app = await this.create()
    const config = this.app.get(ConfigService)

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
  void new RootServer().start()
}
