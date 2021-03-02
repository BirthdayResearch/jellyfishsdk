import {DockerOptions} from 'dockerode'
import {DeFiChainDocker} from './docker'

export class MainNetDocker extends DeFiChainDocker {
  constructor(options?: DockerOptions) {
    super('mainnet', options)
  }

  async getRpcPort(): Promise<string> {
    return this.getPort('8554/tcp')
  }
}
