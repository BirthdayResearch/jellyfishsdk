import Dockerode, { ContainerInfo, DockerOptions } from 'dockerode'
import { DockerContainer } from './DockerContainer'
import { waitForCondition } from '../utils'
import { NativeChainRpc } from '../index'

/**
 * Types of network as per https://github.com/DeFiCh/ain/blob/bc231241/src/chainparams.cpp#L825-L836
 */
type Network = 'mainnet' | 'testnet' | 'devnet' | 'regtest' | 'changi'

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
  rpc = new NativeChainRpc(this)
  /* eslint-disable @typescript-eslint/no-non-null-assertion, no-void */
  public static readonly PREFIX = 'defichain-testcontainers-'

  public static get image (): string {
    if (process?.env?.DEFICHAIN_DOCKER_IMAGE !== undefined) {
      return process.env.DEFICHAIN_DOCKER_IMAGE
    }
    return 'defi/defichain:4.0.0-beta13' // renovate.json regexManagers
  }

  public static readonly DefaultStartOptions = {
    user: 'testcontainers-user',
    password: 'testcontainers-password'
  }

  protected startOptions?: StartOptions
  protected cachedRpcUrl?: string
  protected cachedEvmRpcUrl?: string

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
      '-ethrpcbind=0.0.0.0',
      '-rpcworkqueue=512',
      `-rpcuser=${opts.user!}`,
      `-rpcpassword=${opts.password!}`
    ]
  }

  /**
   * Create container and start it immediately waiting for defid to be ready
   */
  async start (startOptions: StartOptions = {}): Promise<void> {
    await this.tryPullImage()
    this.startOptions = Object.assign(DeFiDContainer.DefaultStartOptions, startOptions)
    this.container = await this.docker.createContainer({
      name: this.generateName(),
      Image: this.image,
      Tty: true,
      Cmd: this.getCmd(this.startOptions),
      Env: [
        'RUST_LOG=debug'
      ],
      HostConfig: {
        PublishAllPorts: true
      }
    })
    await this.container.start()
    await this.waitForRpc(startOptions.timeout)
  }

  /**
   * Set contents of ~/.defi/defi.conf
   * @param {string[]} options to set
   */
  async setDeFiConf (options: string[]): Promise<void> {
    if (options.length > 0) {
      const fileContents = `${options.join('\n')}\n`

      await this.exec({
        Cmd: ['bash', '-c', `echo "${fileContents}" > ~/.defi/defi.conf`]
      })
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
  public abstract getRpcPort (): Promise<string>

  public abstract getEvmRpcPort (): Promise<string>

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

  async getCachedEvmRpcUrl (): Promise<string> {
    if (this.cachedEvmRpcUrl === undefined) {
      const port = await this.getEvmRpcPort()
      const user = this.startOptions!.user!
      const password = this.startOptions!.password!
      this.cachedEvmRpcUrl = `http://${user}:${password}@127.0.0.1:${port}/`
    }
    return this.cachedEvmRpcUrl
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
    return await this.rpc.post(body)
  }

  /**
   * Convenience method to getmininginfo, typing mapping is non-exhaustive
   */
  async getMiningInfo (): Promise<{ blocks: number, chain: string }> {
    return await this.rpc.getMiningInfo()
  }

  /**
   * Convenience method to getblockcount, typing mapping is non exhaustive
   */
  async getBlockCount (): Promise<number> {
    return await this.rpc.getBlockCount()
  }

  /**
   * Convenience method to getbestblockhash, typing mapping is non-exhaustive
   */
  async getBestBlockHash (): Promise<string> {
    return await this.rpc.getBestBlockHash()
  }

  /**
   * Connect another node
   * @param {string} ip
   * @return {Promise<void>}
   */
  async addNode (ip: string): Promise<void> {
    return await this.rpc.addNode(ip)
  }

  /**
   * Wait for rpc to be ready
   * @param {number} [timeout=20000] in millis
   */
  private async waitForRpc (timeout = 40000): Promise<void> {
    await waitForCondition(async () => {
      this.cachedRpcUrl = undefined
      this.rpc = new NativeChainRpc(this, await this.getCachedRpcUrl())
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
   * Stop and remove the current node and their associated volumes.
   *
   * This method will also automatically stop and removes nodes that are stale.
   * Stale nodes are nodes that are running for more than 1 hour
   */
  async stop (): Promise<void> {
    try {
      await this.container?.stop()
    } finally {
      try {
        await this.container?.remove({ v: true })
      } finally {
        await cleanUpStale(DeFiDContainer.PREFIX, this.docker)
      }
    }
  }

  /**
   * Restart container and wait for defid to be ready.
   * This will stop the container and start it again with old data intact.
   * @param {number} [timeout=30000] in millis
   */
  async restart (timeout: number = 30000): Promise<void> {
    await this.container?.restart()
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

/**
 * Clean up stale nodes are nodes that are running for 1 hour
 */
async function cleanUpStale (prefix: string, docker: Dockerode): Promise<void> {
  /**
   * Same prefix and created more than 1 hour ago
   */
  function isStale (containerInfo: ContainerInfo): boolean {
    if (containerInfo.Names.filter((value) => value.startsWith(prefix)).length > 0) {
      return containerInfo.Created + 60 * 60 < Date.now() / 1000
    }

    return false
  }

  /**
   * Stop container that are running, remove them after and their associated volumes
   */
  async function tryStopRemove (containerInfo: ContainerInfo): Promise<void> {
    const container = docker.getContainer(containerInfo.Id)
    if (containerInfo.State === 'running') {
      await container.stop()
    }
    await container.remove({ v: true })
  }

  return await new Promise((resolve, reject) => {
    docker.listContainers({ all: true }, (error, result) => {
      if (error instanceof Error) {
        return reject(error)
      }

      const promises = (result ?? [])
        .filter(isStale)
        .map(tryStopRemove)

      Promise.all(promises).finally(resolve)
    })
  })
}
