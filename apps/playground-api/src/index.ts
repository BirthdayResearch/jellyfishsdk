import { RootModule } from './modules/RootModule'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { RootServer } from '@defichain-apps/libs/rootserver'
import { newFastifyAdapter } from './Fastify'

export class PlaygroundApiServer extends RootServer {
  adapter = newFastifyAdapter()

  async create (): Promise<NestFastifyApplication> {
    return await NestFactory.create<NestFastifyApplication>(RootModule, this.adapter)
  }

  async init (app: NestFastifyApplication, config: ConfigService): Promise<void> {
    await app.listen(process.env.PORT ?? '3000', '0.0.0.0')
  }
}

/**
 * Bootstrap RootModule and start server
 */
if (require.main === module) {
  void new PlaygroundApiServer().start()
}
