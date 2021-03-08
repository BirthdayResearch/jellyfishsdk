import { DockerOptions } from 'dockerode'
import { DeFiDContainer, StartOptions } from './container'

export class TestNetContainer extends DeFiDContainer {
  constructor (options?: DockerOptions) {
    super('testnet', options)
  }

  protected getCmd (opts: StartOptions): string[] {
    return [...super.getCmd(opts), '-testnet=1']
  }

  async getRpcPort (): Promise<string> {
    return await this.getPort('18554/tcp')
  }
}
