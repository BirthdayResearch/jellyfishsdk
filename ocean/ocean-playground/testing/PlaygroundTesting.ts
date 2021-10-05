import { Testing, TestingGroup } from '@defichain/jellyfish-testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { BotLogger, Playground } from '@defichain/ocean-playground'
import { ApiClient } from '@defichain/jellyfish-api-core'

/**
 * Universal Playground Testing framework.
 *
 * As bot have cross cutting concerns. PlaygroundTesting is an e2e setup,
 * it configures the entire Bot and run them all.
 *
 * @see Playground
 */
export class PlaygroundTesting {
  public counter: number = 0

  constructor (
    private readonly testingGroup: TestingGroup,
    private readonly logger: PlaygroundTestingLogger = new PlaygroundTestingLogger(),
    private readonly playground: Playground = new Playground(testingGroup.get(0).rpc, logger)
  ) {
  }

  static create (testingGroup: TestingGroup = TestingGroup.create(1)): PlaygroundTesting {
    return new PlaygroundTesting(testingGroup)
  }

  get group (): TestingGroup {
    return this.testingGroup
  }

  get testing (): Testing {
    return this.testingGroup.get(0)
  }

  get container (): MasterNodeRegTestContainer {
    return this.testing.container
  }

  get rpc (): ApiClient {
    return this.testing.rpc
  }

  /**
   * @see TestingGroup
   * @see Testing
   */
  async start (): Promise<void> {
    await this.group.start()
  }

  /**
   * @see TestingGroup
   * @see Testing
   */
  async stop (): Promise<void> {
    await this.group.stop()
  }

  async bootstrap (): Promise<void> {
    await this.playground.bootstrap()
  }

  async cycle (): Promise<void> {
    await this.playground.cycle()
  }
}

class PlaygroundTestingLogger implements BotLogger {
  info (action: string, message: string): void {
    // not logged during testing
  }
}
