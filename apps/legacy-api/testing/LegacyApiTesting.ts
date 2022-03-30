import { LegacyStubServer, RegisteredRoute, TestOptions } from './LegacyStubServer'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { InjectOptions, Response as LightMyRequestResponse } from 'light-my-request'
import { SupportedNetwork } from '../src/pipes/NetworkValidationPipe'
import { waitForCondition } from '@defichain/testcontainers'
import { DexSwapQueue } from '../src/providers/index/DexSwapQueue'

/**
 * LegacyApi Testing framework.
 */
export class LegacyApiTesting {
  constructor (
    private readonly testOptions: TestOptions,
    private readonly stubServer: LegacyStubServer = new LegacyStubServer(testOptions)
  ) {
  }

  static create (testOptions?: TestOptions): LegacyApiTesting {
    return new LegacyApiTesting(testOptions ?? {
      mainnetBlockCacheCount: 30,
      testnetBlockCacheCount: 30
    })
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

  getAllRoutes (): RegisteredRoute[] {
    return this.stubServer.getAllRoutes()
  }

  /**
   * Helper to wait for swap queue to fully synchronise
   * @param network
   */
  async waitForSyncToTip (network: SupportedNetwork): Promise<void> {
    // Wait for dex swap queue to be ready
    const dexSwapQueue: DexSwapQueue = this.app.get(`DexSwapQueue-${network}`)
    await waitForCondition(async () => dexSwapQueue.isReady, 180_000)
  }
}
