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
    await super.configure(app, config)

    const version = config.get<string>('API_VERSION') as string
    const network = config.get<string>('API_NETWORK') as string

    app.setGlobalPrefix(`${version}/${network}`, {
      exclude: [
        '/_actuator/probes/liveness',
        '/_actuator/probes/readiness'
      ]
    })
  }
}

/**
 * Bootstrap RootModule and start server
 */
if (require.main === module) {
  void new RichListApiServer().start()
}
