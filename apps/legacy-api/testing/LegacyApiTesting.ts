import { LegacyStubServer } from './LegacyStubServer'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { InjectOptions, Response as LightMyRequestResponse } from 'light-my-request'

/**
 * LegacyApi Testing framework.
 */
export class LegacyApiTesting {
  constructor (
    private readonly stubServer: LegacyStubServer = new LegacyStubServer()
  ) {
  }

  static create (): LegacyApiTesting {
    return new LegacyApiTesting()
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
   * @see TestingGroup
   * @see Testing
   * @see LegacyStubServer
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
}
