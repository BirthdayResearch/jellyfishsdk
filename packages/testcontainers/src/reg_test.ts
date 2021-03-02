import {DockerOptions} from 'dockerode'
import {DeFiChainDocker, StartOptions} from './docker'

export class RegTestDocker extends DeFiChainDocker {
  constructor(options?: DockerOptions) {
    super('regtest', options)
  }

  protected getCmd(opts: StartOptions): string[] {
    return [...super.getCmd(opts), '-regtest=1']
  }

  // TODO(fuxingloh): add ability to mint token for reg test

  async getRpcPort(): Promise<string> {
    return this.getPort('19554/tcp')
  }
}
