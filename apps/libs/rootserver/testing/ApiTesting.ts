import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { InjectOptions, Response as LightMyRequestResponse } from 'light-my-request'
import { RootServer } from '@defichain-apps/libs/rootserver'

/**
 * Testing framework.
 */
export abstract class ApiTesting {
  protected abstract stubServer: StubServer

  get app (): NestFastifyApplication {
    if (this.stubServer.app === undefined) {
      throw new Error('app not initialised')
    }
    return this.stubServer.app
  }

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

interface StubServer extends RootServer {
}
