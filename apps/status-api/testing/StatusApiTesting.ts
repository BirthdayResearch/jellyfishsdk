import { StatusStubServer, RegisteredRoute } from './StatusStubServer'
import { ApiTesting } from '../../libs/rootserver/testing/ApiTesting'

/**
 * StatusApi Testing framework.
 */
export class StatusApiTesting extends ApiTesting {
  constructor (
    protected readonly stubServer: StatusStubServer = new StatusStubServer()
  ) {
    super()
  }

  static create (): StatusApiTesting {
    return new StatusApiTesting()
  }

  getAllRoutes (): RegisteredRoute[] {
    return this.stubServer.getAllRoutes()
  }
}
