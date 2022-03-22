import { DockerOptions } from './DockerContainer'
import { DeFiDContainer } from './DeFiDContainer'

export class MainNetContainer extends DeFiDContainer {
  /**
   * @param {string} [image=DeFiDContainer.image] docker image name
   * @param {DockerOptions} [options]
   */
  constructor (image: string = DeFiDContainer.image, options?: DockerOptions) {
    super('mainnet', image, options)
  }

  getRpcPort (): string {
    return this.getPort(8554).toString()
  }
}
