import { StatusStubServer, RegisteredRoute } from './StatusStubServer'
import { ApiTesting } from '../../libs/rootserver/testing/ApiTesting'
import { NestFastifyApplication } from '@nestjs/platform-fastify'

/**
 * StatusApi Testing framework.
 */
export class StatusApiTesting extends ApiTesting {
  constructor (
    readonly stubServer: StatusStubServer = new StatusStubServer()
  ) {
    super()
  }

  get app (): NestFastifyApplication {
    if (this.stubServer.app === undefined) {
      throw new Error('not yet initialized')
    }
    return this.stubServer.app
  }

  static create (): StatusApiTesting {
    return new StatusApiTesting()
  }

  getAllRoutes (): RegisteredRoute[] {
    return this.stubServer.getAllRoutes()
  }
}
