import { MasterNodeRegTestContainer } from './Masternode'
import { DeFiDContainer, StartOptions } from '../DeFiDContainer'
import { StartedTestContainer } from 'testcontainers'
/**
 * PersistentMNRegTestContainer container is a RegTest container with MasterNode minting preconfigured.
 * The container configuration is persistent and can be used consistently.
 * If you do not stop the container, the same container can be used for all tests.
 * However, you must be cognizant of race conditions.
 *
 * This container should not be used for finished work, it merely a dev tool to speed up test-driven development.
 * Once you are done with your dev work, you should swap this out for MasterNodeRegTestContainer.
 */
export class PersistentMNRegTestContainer extends MasterNodeRegTestContainer {
  private static persistentContainer: StartedTestContainer

  /**
   * Init the required container instances  for start/stop operation
   */
  async init (): Promise<void> {
    if (PersistentMNRegTestContainer.persistentContainer === undefined) {
      throw new PersistentContainerNotInitedException()
    }
    this.container = PersistentMNRegTestContainer.persistentContainer
  }

  /**
   * This will only start a persistent container if it's not yet already started.
   * @param {StartOptions} [startOptions={}] to start the container with
   * @see {generateName()} for the name of container
   */
  async start (startOptions: StartOptions = {}): Promise<void> {
    this.startOptions = Object.assign(DeFiDContainer.DefaultStartOptions, startOptions)

    try {
      await this.init()
    } catch (e) {
      // Attempt clean up before starting
      await super.stop()
      await super.start(startOptions)
      PersistentMNRegTestContainer.persistentContainer = this.requireContainer()
    }
  }

  /**
   * @return {string} name of persistent container that is always consistent.
   */
  generateName (): string {
    return `${DeFiDContainer.PREFIX}-${this.network}-persistent`
  }

  async stop (): Promise<void> {
    await this.init()
    await super.stop()
  }
}

class PersistentContainerNotInitedException extends Error {
  message: string = 'The persistent container have not been initialized yet.'
}
