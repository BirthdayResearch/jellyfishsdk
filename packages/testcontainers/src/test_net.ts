import {DockerOptions} from 'dockerode'
import {DeFiChainDocker, StartOptions} from './docker'

export class TestNetDocker extends DeFiChainDocker {
  constructor(options?: DockerOptions) {
    super('testnet', options)
  }

  protected getCmd(opts: StartOptions): string[] {
    return [...super.getCmd(opts), '-testnet=1']
  }

  async getRpcPort(): Promise<string> {
    return this.getPort('18554/tcp')
  }
}
