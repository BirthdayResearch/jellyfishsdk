import { StatusStubServer, RegisteredRoute } from './StatusStubServer'
import { InjectOptions, Response as LightMyRequestResponse } from 'light-my-request'
import { ApiTesting } from '../../libs/rootserver/testing/ApiTesting'

/**
 * StatusApi Testing framework.
 */
export class StatusApiTesting extends ApiTesting {
  constructor (
    readonly stubServer: StatusStubServer = new StatusStubServer()
  ) {
    super(stubServer)
  }

  static create (): StatusApiTesting {
    return new StatusApiTesting()
  }

  async inject (opts: InjectOptions | string): Promise<LightMyRequestResponse> {
    return await this.app.inject(opts)
  }

  getAllRoutes (): RegisteredRoute[] {
    return this.stubServer.getAllRoutes()
  }
}
