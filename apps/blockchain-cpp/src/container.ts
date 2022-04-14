import {
  DeFiDContainer
} from '@defichain/testcontainers'
import { DockerOptions } from 'dockerode'

// May delete later
export class NodeContainer extends DeFiDContainer {
  /**
   * @param {string} image docker image name
   * @param {DockerOptions} [options]
   */
  constructor (image: string = DeFiDContainer.image, options?: DockerOptions) {
    super('mainnet', image, options)
  }

  async getNewAddress (label = '', addressType: 'legacy' | 'p2sh-segwit' | 'bech32' | string = 'bech32'): Promise<string> {
    return await this.call('getnewaddress', [label, addressType])
  }

  async getRpcPort (): Promise<string> {
    return await this.getPort('19554/tcp')
  }
}

export const container = new NodeContainer()
