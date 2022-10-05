import {
  GenericContainer,
  StartedTestContainer
} from 'testcontainers'
import fetch from 'cross-fetch'
import { AbstractStartedContainer } from 'testcontainers/dist/modules/abstract-started-container'
import { getNetwork, Network as BlockchainNetwork, NetworkName } from '@defichain/jellyfish-network'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

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
  }

  static get image (): string {
    if (process?.env?.DEFICHAIN_DOCKER_IMAGE !== undefined) {
      return process.env.DEFICHAIN_DOCKER_IMAGE
    }
    return 'defi/defichain:HEAD-02ef6a1b3'
  }

  public static readonly PREFIX = 'defichain-testcontainers-'

  /**
   * Generate a name for a new docker container with network type and random number
   */
  generateName (): string {
    const rand = Math.floor(Math.random() * 10000000)
    return `${NativeChainContainer.PREFIX}-${this.blockchainNetwork.name}-${rand}`
  }

  protected blockchainNetwork: BlockchainNetwork = getNetwork('testnet')

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
      '-fortcanningepilogueheight=15'
    ],
    mainnet: [],
    devnet: []
  }

  /**
   * Convenience Cmd builder
   */
  protected generateCmd (): string[] {
    // TODO: improve command generation with `addCmd(x)`

    const { defaultCmd } = NativeChainContainer

    const authCmd = [
      `-rpcuser=${this.rpcUser}`,
      `-rpcpassword=${this.rpcPassword}`
    ]

    return [
      ...defaultCmd.prepend,
      ...authCmd,
      ...defaultCmd[this.blockchainNetwork.name]
    ]
  }

  /**
   * Create container and start it immediately waiting for NativeChain to be ready
   */
  public async start (): Promise<StartedNativeChainContainer> {
    this.withExposedPorts(...(this.hasExposedPorts ? this.ports : Object.values(this.blockchainNetwork.ports)))
      .withName(this.name ?? this.generateName())
      .withCmd(this.cmd.length > 0 ? this.cmd : this.generateCmd())

    const {
      rpcUser,
      rpcPassword,
      blockchainNetwork
    } = this
    const startedContainer = new StartedNativeChainContainer(await super.start(), { rpcUser, rpcPassword, blockchainNetwork })
    console.log(startedContainer)
    return startedContainer
  }
}

export interface StartedContainerConfig {
  rpcUser: string
  rpcPassword: string
  blockchainNetwork: BlockchainNetwork
}

export class StartedNativeChainContainer extends AbstractStartedContainer {
  protected readonly rpcUrl: string

  constructor (
    startedTestContainer: StartedTestContainer,
    protected readonly config: StartedContainerConfig
  ) {
    super(startedTestContainer)
    const {
      rpcUser,
      rpcPassword,
      blockchainNetwork
    } = config
    const port = this.getMappedPort(blockchainNetwork.ports.rpc)
    this.rpcUrl = `http://${rpcUser}:${rpcPassword}@127.0.0.1:${port}/`
  }

  /**
   * Set contents of ~/.defi/defi.conf
   * @param {string[]} options to set
   */
  async setDeFiConf (options: string[]): Promise<void> {
    if (options.length > 0) {
      const fileContents = `${options.join('\n')}\n`
      await this.exec(['bash', '-c', `echo "${fileContents}" > ~/.defi/defi.conf`])
    }
  }

  async getJsonRpcClient (): Promise<JsonRpcClient> {
    return new JsonRpcClient(this.rpcUrl)
  }

  /**
   * For convenience sake, utility rpc for the current node.
   * JSON 'result' is parsed and returned
   * @throws NativeChainRpcError is raised for RPC errors
   */
  async call (method: string, params: any = []): Promise<any> {
    const body = JSON.stringify({
      jsonrpc: '1.0',
      id: Math.floor(Math.random() * 100000000000000),
      method: method,
      params: params
    })

    const text = await this.post(body)
    const {
      result,
      error
    } = JSON.parse(text)

    if (error !== undefined && error !== null) {
      throw new NativeChainRpcError(error)
    }

    return result
  }

  /**
   * For convenience’s sake, HTTP POST to the RPC URL for the current node.
   * Not error checked, returns the raw JSON as string.
   */
  async post (body: string): Promise<string> {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      body: body
    })
    return await response.text()
  }

  /**
   * Convenience method to getmininginfo, typing mapping is non-exhaustive
   */
  async getMiningInfo (): Promise<{ blocks: number, chain: string }> {
    return await this.call('getmininginfo', [])
  }

  /**
   * Convenience method to getblockcount, typing mapping is non exhaustive
   */
  async getBlockCount (): Promise<number> {
    return await this.call('getblockcount', [])
  }

  /**
   * Convenience method to getbestblockhash, typing mapping is non-exhaustive
   */
  async getBestBlockHash (): Promise<string> {
    return await this.call('getbestblockhash', [])
  }

  /**
   * Connect another node
   * @param {string} ip
   * @return {Promise<void>}
   */
  async addNode (ip: string): Promise<void> {
    return await this.call('addnode', [ip, 'onetry'])
  }
}

/**
 * RPC error from container
 */
export class NativeChainRpcError extends Error {
  constructor (error: { code: number, message: string }) {
    super(`NativeChainRpcError: '${error.message}', code: ${error.code}`)
  }
}
