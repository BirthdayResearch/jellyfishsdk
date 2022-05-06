import { LegacyStubServer, RegisteredRoute } from './LegacyStubServer'
import { ApiTesting } from '../../libs/rootserver/testing/ApiTesting'

/**
 * LegacyApi Testing framework.
 */
export class LegacyApiTesting extends ApiTesting {
  constructor (
    readonly stubServer: LegacyStubServer = new LegacyStubServer()
  ) {
    super()
  }

  static create (): LegacyApiTesting {
    return new LegacyApiTesting()
  }

  getAllRoutes (): RegisteredRoute[] {
    return this.stubServer.getAllRoutes()
  }
}
