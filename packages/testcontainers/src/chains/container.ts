import Dockerode, { DockerOptions, Container, ContainerInfo } from 'dockerode'
import fetch from 'node-fetch'

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
}

/**
 * Clean up stale nodes are nodes that are running for 1 hour
 */
async function cleanUpStale (docker: Dockerode): Promise<void> {
  /**
   * Same prefix and created more than 1 hour ago
   */
  const isStale = (containerInfo: ContainerInfo): boolean => {
    if (containerInfo.Names.filter((value) => value.startsWith(DeFiDContainer.PREFIX)).length > 0) {
      return containerInfo.Created + 60 * 60 < Date.now() / 1000
    }

    return false
  }

  /**
   * Stop container that are running, remove them after and their associated volumes
   */
  const tryStopRemove = async (containerInfo: ContainerInfo): Promise<void> => {
    const container = docker.getContainer(containerInfo.Id)
    if (containerInfo.State === 'running') {
      await container.stop()
    }
    await container.remove({ v: true })
  }

  return await new Promise((resolve, reject) => {
    docker.listContainers({ all: 1 }, (error, result) => {
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

async function hasImageLocally (docker: Dockerode): Promise<boolean> {
  return await new Promise((resolve, reject) => {
    docker.getImage(DeFiDContainer.image).inspect((error, result) => {
      resolve(!(error instanceof Error))
    })
  })
}

/**
 * Pull DeFiDContainer.image if it doesn't already exist.
 */
async function tryPullImage (docker: Dockerode): Promise<void> {
  if (await hasImageLocally(docker)) {
    return
  }

  return await new Promise((resolve, reject) => {
    docker.pull(DeFiDContainer.image, {}, (error, result) => {
      if (error instanceof Error) {
        reject(error)
        return
      }
      docker.modem.followProgress(result, () => {
        resolve()
      })
    })
  })
}

/**
 * DeFiChain defid node managed in docker
 */
export abstract class DeFiDContainer {
  /* eslint-disable @typescript-eslint/no-non-null-assertion, no-void */
  public static readonly PREFIX = 'defichain-testcontainers-'
  public static readonly image = 'defi/defichain:1.6.3'

  public static readonly DefaultStartOptions = {
    user: 'testcontainers-user',
    password: 'testcontainers-password'
  }

  protected readonly docker: Dockerode
  protected readonly network: Network

  protected container?: Container
  protected startOptions?: StartOptions
  protected cachedRpcUrl?: string

  protected constructor (network: Network, options?: DockerOptions) {
    this.docker = new Dockerode(options)
    this.network = network
  }

  /**
   * Require container, else error exceptionally.
   * Not a clean design, but it keep the complexity of this implementation low.
   */
  protected requireContainer (): Container {
    if (this.container !== undefined) {
      return this.container
    }
    throw new Error('container not yet started')
  }

  /**
   * Convenience Cmd builder with StartOptions
   */
  protected getCmd (opts: StartOptions): string[] {
    return [
      'defid',
      '-printtoconsole',
      '-rpcallowip=172.17.0.0/16',
      '-rpcbind=0.0.0.0',
      `-rpcuser=${opts.user!}`,
      `-rpcpassword=${opts.password!}`
    ]
  }

  /**
   * Always pull a version of DeFiDContainer.image,
   * Create container and start it immediately
   */
  async start (startOptions: StartOptions = {}): Promise<void> {
    await tryPullImage(this.docker)
    this.startOptions = Object.assign(DeFiDContainer.DefaultStartOptions, startOptions)
    this.container = await this.docker.createContainer({
      name: this.generateName(),
      Image: DeFiDContainer.image,
      Tty: true,
      Cmd: this.getCmd(this.startOptions),
      HostConfig: {
        PublishAllPorts: true
      }
    })
    await this.container.start()
  }

  /**
   * Generate a name for a new docker container with network type and random number
   */
  generateName (): string {
    const rand = Math.floor(Math.random() * 10000000)
    return `${DeFiDContainer.PREFIX}-${this.network}-${rand}`
  }

  /**
   * Get host machine port
   *
   * @param name of ExposedPorts e.g. '80/tcp'
   */
  async getPort (name: string): Promise<string> {
    const container = this.requireContainer()

    return await new Promise((resolve, reject) => {
      container.inspect(function (err, data) {
        if (err instanceof Error) {
          return reject(err)
        }

        if (data?.NetworkSettings.Ports[name] !== undefined) {
          return resolve(data.NetworkSettings.Ports[name][0].HostPort)
        }

        return reject(new Error('Unable to find rpc port, the container might have crashed'))
      })
    })
  }

  /**
   * Get host machine port used for defid rpc
   */
  public abstract getRpcPort (): Promise<string>

  /**
   * Get host machine url used for defid rpc calls with auth
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
    const { result, error } = JSON.parse(text)

    if (error !== undefined && error !== null) {
      throw new DeFiDRpcError(error)
    }

    return result
  }

  /**
   * For convenience sake, HTTP post to the RPC URL for the current node.
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
   * Convenience method to getmintinginfo, typing mapping is non exhaustive
   */
  async getMintingInfo (): Promise<{ blocks: number, chain: string }> {
    return await this.call('getmintinginfo', [])
  }

  /**
   * Convenience method to getblockcount, typing mapping is non exhaustive
   */
  async getBlockCount (): Promise<number> {
    return await this.call('getblockcount', [])
  }

  /**
   * Wait for rpc to be ready
   * @param {number} timeout duration, default to 15000ms
   */
  private async waitForRpc (timeout = 15000): Promise<void> {
    const expiredAt = Date.now() + timeout

    return await new Promise((resolve, reject) => {
      const checkReady = (): void => {
        this.cachedRpcUrl = undefined
        this.getMintingInfo().then(() => {
          resolve()
        }).catch(err => {
          if (expiredAt < Date.now()) {
            reject(new Error(`DeFiDContainer docker not ready within given timeout of ${timeout}ms.\n${err.message as string}`))
          } else {
            setTimeout(() => void checkReady(), 200)
          }
        })
      }

      checkReady()
    })
  }

  /**
   * @param {() => Promise<boolean>} condition to wait for true
   * @param {number} timeout duration when condition is not met
   * @param {number} [interval=200] duration in ms
   */
  async waitForCondition (condition: () => Promise<boolean>, timeout: number, interval: number = 200): Promise<void> {
    const expiredAt = Date.now() + timeout

    return await new Promise((resolve, reject) => {
      const checkCondition = async (): Promise<void> => {
        const isReady = await condition().catch(() => false)
        if (isReady) {
          resolve()
        } else if (expiredAt < Date.now()) {
          reject(new Error(`waitForCondition is not ready within given timeout of ${timeout}ms.`))
        } else {
          setTimeout(() => void checkCondition(), interval)
        }
      }

      void checkCondition()
    })
  }

  /**
   * Wait for everything to be ready, override for additional hooks
   * @param {number} timeout duration, default to 15000ms
   */
  async waitForReady (timeout = 15000): Promise<void> {
    return await this.waitForRpc(timeout)
  }

  /**
   * tty into docker
   */
  async exec (opts: { Cmd: string[] }): Promise<void> {
    return await new Promise((resolve, reject) => {
      const container = this.requireContainer()
      container.exec({
        Cmd: opts.Cmd
      }, (error, exec) => {
        if (error instanceof Error) {
          reject(error)
        } else {
          exec?.start({})
            .then(() => resolve())
            .catch(reject)
        }
      })
    })
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
        await cleanUpStale(this.docker)
      }
    }
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
