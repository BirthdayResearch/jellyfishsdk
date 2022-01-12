import { DockerOptions } from 'dockerode'
import { DeFiDContainer, StartOptions } from '../DeFiDContainer'
import { SPV } from './SPV'

/**
 * RegTest DeFiD container
 */
export class RegTestContainer extends DeFiDContainer {
  readonly spv = new SPV(this)

  /**
   * @param {string} image docker image name
   * @param {DockerOptions} [options]
   */
  constructor (image: string = DeFiDContainer.image, options?: DockerOptions) {
    super('regtest', image, options)
  }

  protected getCmd (opts: StartOptions): string[] {
    return [...super.getCmd(opts),
      '-regtest=1',
      '-jellyfish_regtest=1',
      '-txnotokens=0',
      '-logtimemicros',
      '-txindex=1',
      '-acindex=1',
      '-amkheight=0',
      '-bayfrontheight=1',
      '-bayfrontgardensheight=2',
      '-clarkequayheight=3',
      '-dakotaheight=4',
      '-dakotacrescentheight=5',
      '-eunosheight=6',
      '-eunospayaheight=7',
      '-fortcanningheight=8',
      '-fortcanningmuseumheight=9'
    ]
  }

  async waitForBlockHeight (height: number, timeout = 590000): Promise<void> {
    throw new Error('RegTestContainer Violation: waitForBlockHeight is not implemented for non master node containers')
  }

  async waitForWalletBalanceGTE (balance: number, timeout = 300000): Promise<void> {
    throw new Error('RegTestContainer Violation: waitForWalletBalanceGTE is not implemented for non master node containers')
  }

  async getNewAddress (label: string = '', addressType: 'legacy' | 'p2sh-segwit' | 'bech32' | string = 'bech32'): Promise<string> {
    return await this.call('getnewaddress', [label, addressType])
  }

  async getRpcPort (): Promise<string> {
    return await this.getPort('19554/tcp')
  }

  async generate (nblocks: number, address?: string, maxTries: number = 1000000): Promise<void> {
    throw new Error('RegTestContainer Violation: generate is not implemented for non master node containers')
  }

  async fundAddress (address: string, amount: number): Promise<{ txid: string, vout: number }> {
    throw new Error('RegTestContainer Violation: fundAddress is not implemented for non master node containers')
  }
}
