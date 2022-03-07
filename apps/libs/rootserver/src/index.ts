import { ConfigService } from '@nestjs/config'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'

export abstract class RootServer {
  app?: NestFastifyApplication
  adapter = new FastifyAdapter({ logger: true })

  abstract create (): Promise<NestFastifyApplication>

  abstract configure (app: NestFastifyApplication, config: ConfigService): Promise<void>

  abstract init (app: NestFastifyApplication, config: ConfigService): Promise<void>

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
