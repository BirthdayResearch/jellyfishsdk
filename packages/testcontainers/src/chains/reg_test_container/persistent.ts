import { MasterNodeRegTestContainer } from './masternode'
import { DeFiDContainer, StartOptions } from '../container'
import Dockerode, { ContainerInfo } from 'dockerode'

async function getContainerInfoByName (docker: Dockerode, name: string): Promise<ContainerInfo | undefined> {
  return await new Promise((resolve, reject) => {
    const opts = { limit: 1, filters: `{"name": ["${name}"]}` }
    docker.listContainers(opts, function (err, containers) {
      if (err === undefined && containers !== undefined) {
        resolve(containers[0])
      }

      reject(err)
    })
  })
}

/**
 * Persist container is a RegTest container with MasterNode minting preconfigured.
 * The container configuration is persistent and can be used consistently.
 * If you did not stop it, the same container will be used for all tests.
 * Beware of race conditions.
 */
export class PersistentMNRegTestContainer extends MasterNodeRegTestContainer {
  /**
   * This will only start a persistent container if it's not yet already started.
   * @see {generateName()} for the name of container
   */
  async start (startOptions: StartOptions = {}): Promise<void> {
    this.startOptions = Object.assign(DeFiDContainer.DefaultStartOptions, startOptions)

    try {
      const info = await getContainerInfoByName(this.docker, this.generateName())
      this.container = info?.Id !== undefined ? this.docker.getContainer(info.Id) : undefined
      this.requireContainer()
      await this.waitForReady(3000)
    } catch (e) {
      // Attempt clean up before starting
      await super.stop()
      await super.start(startOptions)
    }
  }

  /**
   * Name of persist container is always consistent.
   */
  generateName (): string {
    return `${DeFiDContainer.PREFIX}-${this.network}-persistent`
  }
}
