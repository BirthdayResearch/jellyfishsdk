import { ConfigService } from '@nestjs/config'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'

export abstract class RootServer {
  app?: NestFastifyApplication
  adapter = new FastifyAdapter({ logger: true })

  abstract create (): Promise<NestFastifyApplication>

  abstract configure (app: NestFastifyApplication, config: ConfigService): Promise<void>

  abstract init (app: NestFastifyApplication, config: ConfigService): Promise<void>

  abstract start (): Promise<void>

  abstract stop (): Promise<void>
}
