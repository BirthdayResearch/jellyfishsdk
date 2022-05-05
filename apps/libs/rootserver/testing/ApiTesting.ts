import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { InjectOptions, Response as LightMyRequestResponse } from 'light-my-request'

/**
 * Testing framework.
 */
export abstract class ApiTesting {
  abstract stubServer: StubServer

  abstract get app (): NestFastifyApplication

  async inject (opts: InjectOptions | string): Promise<LightMyRequestResponse> {
    return await this.app.inject(opts)
  }

  /**
   * Start connected services for testing.
   *
   * @see StatusStubServer | LegacyStubServer | OceanStubServer | PlaygroundStubServer
   */
  async start (): Promise<void> {
    await this.stubServer.start()
  }

  /**
   * Stop all connected services.
   *
   * @see StatusStubServer | LegacyStubServer | OceanStubServer | PlaygroundStubServer
   */
  async stop (): Promise<void> {
    try {
      await this.stubServer.stop()
    } catch (err) {
      console.error(err)
    }
  }
}

interface StubServer {
  start: () => Promise<void>
  stop: () => Promise<void>
}
