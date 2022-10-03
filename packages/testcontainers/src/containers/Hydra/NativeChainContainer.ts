import {
  GenericContainer,
  Network,
  StartedTestContainer
} from 'testcontainers'
import fetch from 'cross-fetch'
import { AbstractStartedContainer } from 'testcontainers/dist/modules/abstract-started-container'
import { getNetwork, Network as JellyfishNetwork } from '@defichain/jellyfish-network'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

/**
 * Mandatory options to start NativeChain with
 */
export interface StartOptions {
  // TODO(fuxingloh): change to cookie based auth soon
  user: string
  password: string
  timeout?: number
  startFlags?: StartFlags[]
}

export interface StartFlags {
  name: string
  value: number
}

/**
 * DeFiChain NativeChain node managed in docker
 */
export class NativeChainContainer extends GenericContainer {
  /**
   * @param {string} image docker image name
   */
  constructor (
    image: string = NativeChainContainer.image,
    protected readonly config: JellyfishNetwork = getNetwork('testnet')
  ) {
    super(image)
  }

  static get image (): string {
    if (process?.env?.DEFICHAIN_DOCKER_IMAGE !== undefined) {
      return process.env.DEFICHAIN_DOCKER_IMAGE
    }
    return 'defi/defichain:HEAD-02ef6a1b3'
  }

  public static readonly DefaultStartOptions = {
    user: 'testcontainers-user',
    password: 'testcontainers-password'
  }

  protected startOptions: StartOptions = NativeChainContainer.DefaultStartOptions
  protected cachedRpcUrl?: string

  /**
   * Convenience Cmd builder with StartOptions
   */
  protected getCmd (): string[] {
    const { user, password } = this.startOptions

    return [
      'defid',
      '-printtoconsole',
      '-rpcallowip=0.0.0.0/0',
      '-rpcbind=0.0.0.0',
      '-rpcworkqueue=512',
      `-rpcuser=${user}`,
      `-rpcpassword=${password}`
    ]
  }

  /* eslint-disable @typescript-eslint/no-non-null-assertion, no-void */
  public static readonly PREFIX = 'defichain-testcontainers-'

  /**
   * Create container and start it immediately waiting for NativeChain to be ready
   */
  public async start (): Promise<StartedNativeChainContainer> {
    const network = await new Network().start()

    const rand = Math.floor(Math.random() * 10000000)

    this.withExposedPorts(...Object.values(this.config.ports))
      .withName(`${NativeChainContainer.PREFIX}-${this.config.name}-${rand}`)
      .withNetworkMode(network.getName())
      .withCmd(this.getCmd())
      .withStartupTimeout(120_000)

    const startedContainer = new StartedNativeChainContainer(await super.start(), this.startOptions, this.config)
    return startedContainer
  }
}

export class StartedNativeChainContainer extends AbstractStartedContainer {
  protected startOptions: StartOptions = NativeChainContainer.DefaultStartOptions

  // Isaac: is this still necessary?
  protected cachedRpcUrl?: string

  constructor (startedTestContainer: StartedTestContainer, startOptions: StartOptions, protected readonly config: JellyfishNetwork = getNetwork('testnet')) {
    super(startedTestContainer)
    this.startOptions = startOptions
    this.config = config
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

  /**
  * Get host machine url used for NativeChain rpc calls with auth
  * TODO(fuxingloh): not a great design when network config changed, the url and ports get refresh
  */
  async getCachedRpcUrl (): Promise<string> {
    if (this.cachedRpcUrl === undefined) {
      const port = this.getMappedPort(this.config.ports.rpc)
      const user = this.startOptions.user
      const password = this.startOptions.password
      this.cachedRpcUrl = `http://${user}:${password}@127.0.0.1:${port}/`
    }
    return this.cachedRpcUrl
  }

  async getJsonRpcProvider (): Promise<JsonRpcClient> {
    return new JsonRpcClient(await this.getCachedRpcUrl())
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
    const url = await this.getCachedRpcUrl()
    const response = await fetch(url, {
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
