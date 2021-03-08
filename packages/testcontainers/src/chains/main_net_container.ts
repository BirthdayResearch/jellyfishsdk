import { DockerOptions } from 'dockerode'
import { DeFiDContainer } from './container'

export class MainNetContainer extends DeFiDContainer {
  constructor (options?: DockerOptions) {
    super('mainnet', options)
  }

  async getRpcPort (): Promise<string> {
    return await this.getPort('8554/tcp')
  }
}
