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
    const cmds = [...super.getCmd(opts),
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
      '-fortcanningmuseumheight=9',
      '-fortcanninghillheight=10',
      '-fortcanningroadheight=11',
      '-fortcanningcrunchheight=12',
      '-fortcanningspringheight=13',
      '-fortcanninggreatworldheight=14',
      '-fortcanningepilogueheight=15',
      '-grandcentralheight=16',
      '-grandcentralepilogueheight=17',
      '-nextnetworkupgradeheight=18',
      '-regtest-skip-loan-collateral-validation',
      '-regtest-minttoken-simulate-mainnet=0',
      '-rpc-governance-accept-neutral=1'
    ]

    if (opts.startFlags != null && opts.startFlags.length > 0) {
      opts.startFlags.forEach((flag) => {
        cmds.push(`-${flag.name}=${flag.value}`)
      })
    }
    return cmds
  }

  async getNewAddress (label: string = '', addressType: 'legacy' | 'p2sh-segwit' | 'bech32' | 'eth' | string = 'bech32'): Promise<string> {
    return await this.rpc.getNewAddress(label, addressType)
  }

  async getRpcPort (): Promise<string> {
    return await this.getPort('19554/tcp')
  }

  async getEvmRpcPort (): Promise<string> {
    return await this.getPort('19551/tcp')
  }
}
