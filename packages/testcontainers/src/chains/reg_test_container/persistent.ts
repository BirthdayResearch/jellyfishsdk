import { MasterNodeRegTestContainer } from './masternode'
import { DeFiDContainer, StartOptions } from '../container'
import Dockerode, { ContainerInfo } from 'dockerode'

async function getContainerInfoByName (docker: Dockerode, name: string): Promise<ContainerInfo | undefined> {
  return await new Promise((resolve, reject) => {
    const opts = { limit: 1, filters: `{"name": ["${name}"]}` }
    docker.listContainers(opts, function (err, containers) {
      if (err === null && containers !== undefined) {
        resolve(containers[0])
      } else {
        reject(err)
      }
    })
  })
}

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
  /**
   * Init the required container instances  for start/stop operation
   */
  async init (): Promise<void> {
    const info = await getContainerInfoByName(this.docker, this.generateName())
    this.container = info?.Id !== undefined ? this.docker.getContainer(info.Id) : undefined
  }

  /**
   * This will only start a persistent container if it's not yet already started.
   * @see {generateName()} for the name of container
   */
  async start (startOptions: StartOptions = {}): Promise<void> {
    this.startOptions = Object.assign(DeFiDContainer.DefaultStartOptions, startOptions)

    try {
      await this.init()
      this.requireContainer()
      await this.waitForReady(3000)
    } catch (e) {
      // Attempt clean up before starting
      await super.stop()
      await super.start(startOptions)
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
