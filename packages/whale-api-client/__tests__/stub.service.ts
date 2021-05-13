import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp } from '../../../src/e2e.module'

/**
 * Service stubs are simulations of a real service, which are used for functional testing.
 * Configures a TestingModule that is configured to connect to a provided @defichain/testcontainers.
 */
export class StubService {
  app?: NestFastifyApplication

  constructor (readonly container: MasterNodeRegTestContainer) {
  }

  async start (): Promise<void> {
    this.app = await createTestingApp(this.container)
  }

  async stop (): Promise<void> {
    this.app?.close()
  }
}
