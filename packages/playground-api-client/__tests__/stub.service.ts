import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp } from '../../../src/e2e.module'

/**
 * Service stubs are simulations of a real service, which are used for functional testing.
 * Configures a TestingModule that is configured to connect to a provided @defichain/testcontainers.
 */
export class StubService {
  app?: NestFastifyApplication

  constructor (readonly container: MasterNodeRegTestContainer = new MasterNodeRegTestContainer()) {
  }

  async start (): Promise<void> {
    await this.container.start()
    this.app = await createTestingApp(this.container)
  }

  async stop (): Promise<void> {
    if (this.app === undefined) {
      throw new Error('attempting to stop service without starting it previously')
    }
    await stopTestingApp(this.container, this.app)
  }
}
