import { RootModule } from './modules/RootModule'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { NestFactory } from '@nestjs/core'
import { RootServer } from '@defichain-apps/libs/rootserver'

export class OceanApiServer extends RootServer {
  async create (): Promise<NestFastifyApplication> {
    return await NestFactory.create<NestFastifyApplication>(RootModule, this.adapter)
  }
}

/**
 * Bootstrap RootModule and start server
 */
if (require.main === module) {
  void new OceanApiServer().start()
}
