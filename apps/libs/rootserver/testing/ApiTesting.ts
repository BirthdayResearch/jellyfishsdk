import { OceanStubServer } from '../../../ocean-api/testing/OceanStubServer'
import { PlaygroundStubServer } from '../../../playground-api/testing/PlaygroundStubServer'
import { StatusStubServer } from '../../../status-api/testing/StatusStubServer'
import { LegacyStubServer } from '../../../legacy-api/testing/LegacyStubServer'
import { NestFastifyApplication } from '@nestjs/platform-fastify'

/**
 * Testing framework.
 */
export class ApiTesting {
  stubServer: LegacyStubServer | PlaygroundStubServer | OceanStubServer | StatusStubServer
  constructor (
    stubServer: LegacyStubServer | PlaygroundStubServer | OceanStubServer | StatusStubServer
  ) {
    this.stubServer = stubServer
  }

  get app (): NestFastifyApplication {
    if (this.stubServer.app === undefined) {
      throw new Error('not yet initialized')
    }
    return this.stubServer.app
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
