import { GenericContainer, StartedTestContainer } from 'testcontainers'
import { AbstractStartedContainer } from 'testcontainers/dist/modules/abstract-started-container'
import {
  getNetwork,
  MasterNodeKey,
  Network as BlockchainNetwork,
  NetworkName,
  RegTestFoundationKeys
} from '@defichain/jellyfish-network'
import { RestartOptions } from 'testcontainers/dist/test-container'
import { NativeChainRpc } from './NativeChainRpc'
import { NativeChainWaitFor } from './NativeChainWaitFor'
import { ExecResult } from 'testcontainers/dist/docker/types'

/**
 * DeFiChain NativeChain node managed in docker
 */
export class NativeChainContainer extends GenericContainer {
  /**
   * @param {string} image docker image name
   */
  constructor (
    image: string = NativeChainContainer.image
  ) {
    super(image)
    this.name = this.generateName()
  }

  static get image (): string {
    if (process?.env?.DEFICHAIN_DOCKER_IMAGE !== undefined) {
      return process.env.DEFICHAIN_DOCKER_IMAGE
    }
    return 'defi/defichain:3.2.2'
  }

  public static readonly PREFIX = 'defichain-testcontainers-'

  /**
   * Generate a name for a new docker container with network type and random number
   */
  generateName (): string {
    const rand = Math.floor(Math.random() * 10000000)
    return `${NativeChainContainer.PREFIX}-${this.blockchainNetwork.name}-${rand}`
  }

  protected blockchainNetwork: BlockchainNetwork = getNetwork('regtest')

  /**
   * @param networkName Blockchain network name (e.g. 'testnet')
   * @returns this
   */
  public withBlockchainNetwork (networkName: NetworkName): this {
    this.blockchainNetwork = getNetwork(networkName)
    return this
  }

  public static readonly DefaultRpcUser = 'testcontainers-user'
  public static readonly DefaultRpcPassword = 'testcontainers-password'

  protected rpcUser: string = NativeChainContainer.DefaultRpcUser
  protected rpcPassword: string = NativeChainContainer.DefaultRpcPassword

  public withRpcUser (rpcUser: string): this {
    this.rpcUser = rpcUser
    return this
  }

  public withRpcPassword (rpcPassword: string): this {
    this.rpcPassword = rpcPassword
    return this
  }

  protected masterNodeKey?: MasterNodeKey

  public withMasterNodeKey (key: MasterNodeKey): this {
    this.masterNodeKey = key
    return this
  }

  public withPreconfiguredRegtestMasternode (masterNodeKey = RegTestFoundationKeys[0]): this {
    this.withMasterNodeKey(masterNodeKey)
    this.withBlockchainNetwork('regtest')
    return this
  }

  public static readonly defaultCmd = {
    prepend: [
      'defid',
      '-printtoconsole',
      '-rpcallowip=0.0.0.0/0',
      '-rpcbind=0.0.0.0',
      '-rpcworkqueue=512'
    ],
    testnet: [
      '-testnet=1'
    ],
    regtest: [
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
      '-regtest-skip-loan-collateral-validation',
      '-regtest-minttoken-simulate-mainnet=0'
    ],
    mainnet: [],
    devnet: [],
    masternode: [
      '-dummypos=0',
      '-spv=1',
      '-anchorquorum=2'
    ]
  }

  /**
   * Convenience Cmd builder
   */
  protected generateCmd (): string[] {
    const { defaultCmd } = NativeChainContainer

    const authCmd = [
      `-rpcuser=${this.rpcUser}`,
      `-rpcpassword=${this.rpcPassword}`
    ]

    const masterNodeOperator = (this.masterNodeKey != null)
      ? [`-masternode_operator=${this.masterNodeKey.operator.address}`]
      : []

    return [
      ...defaultCmd.prepend,
      ...authCmd,
      ...defaultCmd[this.blockchainNetwork.name],
      ...(this.masterNodeKey != null) ? defaultCmd.masternode : [],
      ...masterNodeOperator,
      ...this.addedCmds
    ]
  }

  private readonly addedCmds: string[] = []
  public addCmd (newCmd: string): this {
    this.addedCmds.push(newCmd)
    return this
  }

  /**
   * Create container and start it immediately waiting for NativeChain to be ready
   */
  public async start (): Promise<StartedNativeChainContainer> {
    this.withExposedPorts(...(this.hasExposedPorts ? this.ports : Object.values(this.blockchainNetwork.ports)))
      .withCommand(this.command.length > 0 ? this.command.concat(this.addedCmds) : this.generateCmd())

    const config = {
      rpcUser: this.rpcUser,
      rpcPassword: this.rpcPassword,
      blockchainNetwork: this.blockchainNetwork
    }

    const sncc = new StartedNativeChainContainer(await super.start(), config)
    if (this.masterNodeKey != null) {
      await sncc.withMasterNode(this.masterNodeKey)
    }
    return sncc
  }
}

export interface StartedContainerConfig {
  rpcUser: string
  rpcPassword: string
  blockchainNetwork: BlockchainNetwork
}

export class StartedNativeChainContainer extends AbstractStartedContainer {
  rpc = new NativeChainRpc(this)
  waitFor = new NativeChainWaitFor(this)
  private _masterNodeKey?: MasterNodeKey

  constructor (
    startedTestContainer: StartedTestContainer,
    private readonly config: StartedContainerConfig
  ) {
    super(startedTestContainer)
  }

  get rpcUser (): string {
    return this.config.rpcUser
  }

  get rpcPassword (): string {
    return this.config.rpcPassword
  }

  get blockchainNetwork (): BlockchainNetwork {
    return this.config.blockchainNetwork
  }

  get masterNodeKey (): MasterNodeKey | undefined {
    return this._masterNodeKey
  }

  public async withMasterNode (key: MasterNodeKey): Promise<this> {
    await this.rpc.call('importprivkey', [key.operator.privKey, 'operator', true])
    await this.rpc.call('importprivkey', [key.owner.privKey, 'owner', true])
    this._masterNodeKey = key
    return this
  }

  async restart (options?: Partial<RestartOptions> | undefined): Promise<void> {
    await super.restart(options)
    this.rpc = new NativeChainRpc(this)
  }

  /**
   * Set contents of ~/.defi/defi.conf
   * @param {string[]} options to set
   */
  async setDeFiConf (options: string[]): Promise<ExecResult> {
    if (options.length <= 0) {
      throw new Error('No options specified. Please specify an option to set.')
    }
    const fileContents = `${options.join('\n')}\n`
    return await this.exec(['bash', '-c', `echo "${fileContents}" > ~/.defi/defi.conf`])
  }
}
