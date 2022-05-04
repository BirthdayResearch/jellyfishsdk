import { LegacyStubServer, RegisteredRoute } from './LegacyStubServer'
import { ApiTesting } from '../../libs/rootserver/testing/ApiTesting'
import { NestFastifyApplication } from '@nestjs/platform-fastify'

/**
 * LegacyApi Testing framework.
 */
export class LegacyApiTesting extends ApiTesting {
  constructor (
    readonly stubServer: LegacyStubServer = new LegacyStubServer()
  ) {
    super()
  }

  get app (): NestFastifyApplication {
    if (this.stubServer.app === undefined) {
      throw new Error('not yet initialized')
    }
    return this.stubServer.app
  }

  static create (): LegacyApiTesting {
    return new LegacyApiTesting()
  }

  getAllRoutes (): RegisteredRoute[] {
    return this.stubServer.getAllRoutes()
  }
}
