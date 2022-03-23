import fetch from 'cross-fetch'
import { DockerContainer, DockerOptions } from './DockerContainer'
import { waitForCondition } from '../utils'
import { dockerClient } from 'testcontainers/dist/docker/docker-client'
/**
 * Types of network as per https://github.com/DeFiCh/ain/blob/bc231241/src/chainparams.cpp#L825-L836
 */
type Network = 'mainnet' | 'testnet' | 'devnet' | 'regtest'

/**
 * Mandatory options to start defid with
 */
export interface StartOptions {
  // TODO(fuxingloh): change to cookie based auth soon
  user?: string
  password?: string
  timeout?: number
  startFlags?: StartFlags[]
}

export interface StartFlags {
  name: string
  value: number
}

/**
 * DeFiChain defid node managed in docker
 */
export abstract class DeFiDContainer extends DockerContainer {
  /* eslint-disable @typescript-eslint/no-non-null-assertion, no-void */
  public static readonly PREFIX = 'defichain-testcontainers-'

  public static get image (): string {
    if (process?.env?.DEFICHAIN_DOCKER_IMAGE !== undefined) {
      return process.env.DEFICHAIN_DOCKER_IMAGE
    }
    return 'defi/defichain:master-3f7f6ecc3'
  }

  public static readonly DefiDPorts: Record<Network, number[]> = {
    mainnet: [8554, 8555],
    testnet: [18554, 18555],
    devnet: [18554, 18555],
    regtest: [19554, 19555]
  }

  public static readonly DefaultStartOptions = {
    user: 'testcontainers-user',
    password: 'testcontainers-password'
  }

  protected startOptions?: StartOptions
  protected cachedRpcUrl?: string

  /**
   * @param {Network} network of the container
   * @param {string} image docker image name
   * @param {DockerOptions} options
   */
  protected constructor (
    protected readonly network: Network,
    protected readonly image: string = DeFiDContainer.image,
    options?: DockerOptions
  ) {
    super(image, options)
  }

  /**
   * Convenience Cmd builder with StartOptions
   */
  protected getCmd (opts: StartOptions): string[] {
    return [
      'defid',
      '-printtoconsole',
      '-rpcallowip=0.0.0.0/0',
      '-rpcbind=0.0.0.0',
      '-rpcworkqueue=512',
      `-rpcuser=${opts.user!}`,
      `-rpcpassword=${opts.password!}`
    ]
  }

  /**
   * Create container and start it immediately waiting for defid to be ready
   */
  async start (startOptions: StartOptions = {}): Promise<void> {
    this.startOptions = Object.assign(DeFiDContainer.DefaultStartOptions, startOptions)
    const timeout = this.startOptions.timeout !== undefined ? this.startOptions.timeout : 20000

    this.docker
      .withName(this.generateName())
      .withCmd(this.getCmd(this.startOptions))
      .withExposedPorts(...DeFiDContainer.DefiDPorts[this.network])
    await this._startContainer()
    await this.waitForRpc(timeout)
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
   * Generate a name for a new docker container with network type and random number
   */
  generateName (): string {
    const rand = Math.floor(Math.random() * 10000000)
    return `${DeFiDContainer.PREFIX}-${this.network}-${rand}`
  }

  /**
   * Get host machine port used for defid rpc
   */
  public abstract getRpcPort (): string

  /**
   * Get host machine url used for defid rpc calls with auth
   * TODO(fuxingloh): not a great design when network config changed, the url and ports get refresh
   */
  async getCachedRpcUrl (): Promise<string> {
    if (this.cachedRpcUrl === undefined) {
      const port = await this.getRpcPort()
      const user = this.startOptions!.user!
      const password = this.startOptions!.password!
      this.cachedRpcUrl = `http://${user}:${password}@127.0.0.1:${port}/`
    }
    return this.cachedRpcUrl
  }

  /**
   * For convenience sake, utility rpc for the current node.
   * JSON 'result' is parsed and returned
   * @throws DeFiDRpcError is raised for RPC errors
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
      throw new DeFiDRpcError(error)
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

  /**
   * Wait for rpc to be ready
   * @param {number} [timeout=20000] in millis
   */
  private async waitForRpc (timeout = 20000): Promise<void> {
    await waitForCondition(async () => {
      this.cachedRpcUrl = undefined
      await this.getMiningInfo()
      return true
    }, timeout, 500, 'waitForRpc')
  }

  /**
   * @deprecated as container.start() will automatically wait for ready now, you don't need to call this anymore
   */
  async waitForReady (timeout = 40000): Promise<void> {
    return await this.waitForRpc(timeout)
  }

  /**
   * Stop the current node and their associated volumes.
   * Removal should be automatic based on testcontainers' implementation
   */
  async stop (): Promise<void> {
    await this._stopContainer()
  }

  /**
   * Restart container and wait for defid to be ready.
   * This will stop the container and start it again with old data intact.
   * @param {number} [timeout=30000] in millis
   */
  async restart (timeout: number = 30000): Promise<void> {
    const dockerrode = (await dockerClient).dockerode
    const dockerrodeContainer = dockerrode.getContainer(this.requireContainer().getId())
    await dockerrodeContainer.restart()
    await this.waitForRpc(timeout)
  }
}

/**
 * RPC error from container
 */
export class DeFiDRpcError extends Error {
  constructor (error: { code: number, message: string }) {
    super(`DeFiDRpcError: '${error.message}', code: ${error.code}`)
  }
}
