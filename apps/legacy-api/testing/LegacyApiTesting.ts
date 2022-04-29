import { LegacyStubServer, RegisteredRoute } from './LegacyStubServer'
import { InjectOptions, Response as LightMyRequestResponse } from 'light-my-request'
import { ApiTesting } from '../../libs/rootserver/testing/ApiTesting'

/**
 * LegacyApi Testing framework.
 */
export class LegacyApiTesting extends ApiTesting {
  constructor (
    readonly stubServer: LegacyStubServer = new LegacyStubServer()
  ) {
    super(stubServer)
  }

  static create (): LegacyApiTesting {
    return new LegacyApiTesting()
  }

  async inject (opts: InjectOptions | string): Promise<LightMyRequestResponse> {
    return await this.app.inject(opts)
  }

  getAllRoutes (): RegisteredRoute[] {
    return this.stubServer.getAllRoutes()
  }
}
