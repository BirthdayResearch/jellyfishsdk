import { DockerOptions } from 'dockerode'
import { DeFiDContainer } from './DeFiDContainer'

export class MainNetContainer extends DeFiDContainer {
  /**
   * @param {string} [image=DeFiDContainer.image] docker image name
   * @param {DockerOptions} [options]
   */
  constructor (image: string = DeFiDContainer.image, options?: DockerOptions) {
    super('mainnet', image, options)
  }

  async getRpcPort (): Promise<string> {
    return await this.getPort('8554/tcp')
  }

  async getEvmRpcPort (): Promise<string> {
    return await this.getPort('8551/tcp')
  }
}
