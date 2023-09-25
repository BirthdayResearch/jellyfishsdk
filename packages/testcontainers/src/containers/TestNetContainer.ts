import { DockerOptions } from 'dockerode'
import { DeFiDContainer, StartOptions } from './DeFiDContainer'

export class TestNetContainer extends DeFiDContainer {
  /**
   * @param {string} [image=DeFiDContainer.image] docker image name
   * @param {DockerOptions} [options]
   */
  constructor (image: string = DeFiDContainer.image, options?: DockerOptions) {
    super('testnet', image, options)
  }

  protected getCmd (opts: StartOptions): string[] {
    return [...super.getCmd(opts), '-testnet=1']
  }

  async getRpcPort (): Promise<string> {
    return await this.getPort('18554/tcp')
  }

  async getEvmRpcPort (): Promise<string> {
    return await this.getPort('18551/tcp')
  }
}
