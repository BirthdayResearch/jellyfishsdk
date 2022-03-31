import { StatusStubServer, RegisteredRoute } from './StatusStubServer'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { InjectOptions, Response as LightMyRequestResponse } from 'light-my-request'

/**
 * StatusApi Testing framework.
 */
export class StatusApiTesting {
  constructor (
    private readonly stubServer: StatusStubServer = new StatusStubServer()
  ) {
  }

  static create (): StatusApiTesting {
    return new StatusApiTesting()
  }

  get app (): NestFastifyApplication {
    if (this.stubServer.app === undefined) {
      throw new Error('not yet initialized')
    }
    return this.stubServer.app
  }

  async inject (opts: InjectOptions | string): Promise<LightMyRequestResponse> {
    return await this.app.inject(opts)
  }

  /**
   * Start connected services for testing.
   *
   * @see StatusStubServer
   */
  async start (): Promise<void> {
    await this.stubServer.start()
  }

  /**
   * Stop all connected services.
   *
   * @see TestingGroup
   * @see Testing
   * @see LegacyStubServer
   */
  async stop (): Promise<void> {
    try {
      await this.stubServer.stop()
    } catch (err) {
      console.error(err)
    }
  }

  getAllRoutes (): RegisteredRoute[] {
    return this.stubServer.getAllRoutes()
  }
}
