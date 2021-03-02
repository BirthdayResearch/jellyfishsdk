import Dockerode, {DockerOptions, Container} from 'dockerode'
import fetch from 'node-fetch'
import JSONBig from 'json-bigint'

export type Network = 'mainnet' | 'testnet' | 'regtest'

export interface StartOptions {
  // TODO(fuxingloh): change to cookie based auth soon
  user: string
  password: string
}

/**
 * DeFiChain defid node managed in docker
 */
export abstract class DeFiChainDocker {
  protected static readonly PREFIX = 'defichain-testcontainers-'
  protected readonly docker: Dockerode
  protected readonly image = 'defi/defichain:1.5.0'
  protected readonly network: Network

  protected container?: Container
  protected startOptions?: StartOptions

  protected constructor(network: Network, options?: DockerOptions) {
    this.docker = new Dockerode(options)
    this.network = network
  }

  /**
   * Generate a name for a new docker container with network type and random number
   */
  protected generateName(): string {
    const rand = Math.floor(Math.random() * 10000000)
    return `${DeFiChainDocker.PREFIX}-${this.network}-${rand}`
  }

  protected getCmd(opts: StartOptions): string[] {
    return [
      'defid',
      '-printtoconsole',
      '-rpcallowip=172.17.0.0/16',
      '-rpcbind=0.0.0.0',
      `-rpcuser=${opts.user}`,
      `-rpcpassword=${opts.password}`,
    ]
  }

  /**
   * Start defid node on docker
   *
   * @param startOptions
   */
  async start(startOptions: StartOptions): Promise<void> {
    this.startOptions = startOptions
    this.container = await this.docker.createContainer({
      name: this.generateName(),
      Image: this.image,
      Tty: true,
      Cmd: this.getCmd(startOptions),
      HostConfig: {
        PublishAllPorts: true,
      },
    })
    await this.container.start()
  }

  /**
   * Get host machine port
   *
   * @param name of ExposedPorts e.g. '80/tcp'
   */
  async getPort(name: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.container!.inspect(function (err, data) {
        if (err) {
          reject(err)
        } else {
          resolve(data!.NetworkSettings.Ports[name][0].HostPort)
        }
      })
    })
  }

  /**
   * Get host machine port used for defid rpc
   */
  public abstract getRpcPort(): Promise<string>

  /**
   * Get host machine url used for defid rpc calls with auth
   */
  async getRpcUrl() {
    const port = await this.getRpcPort()
    const user = this.startOptions?.user
    const password = this.startOptions?.password
    return `http://${user}:${password}@127.0.0.1:${port}/`
  }

  /**
   * Utility rpc function for the current node.
   * This is not error checked, it will just return the raw result.
   *
   * @param method
   * @param params
   */
  async call(method: string, params: any): Promise<any> {
    const url = await this.getRpcUrl()
    const response = await fetch(url, {
      method: 'POST',
      body: JSONBig.stringify({
        jsonrpc: '1.0',
        id: Math.floor(Math.random() * 10000000000000000),
        method: method,
        params: params,
      }),
    })
    const text = await response.text()
    return JSONBig.parse(text)
  }

  /**
   * @param timeout millis, default to 15000 ms
   * @param interval millis, default to 200ms
   */
  async ready(timeout = 15000, interval = 200): Promise<void> {
    const expiredAt = Date.now() + timeout

    return new Promise((resolve, reject) => {
      const checkReady = async () => {
        try {
          const result = await this.call('getmintinginfo', [])
          if (result?.result) {
            return resolve()
          }
        } catch (err) {}

        if (expiredAt < Date.now()) {
          return reject(new Error(`DeFiChain docker not ready within given timeout of ${timeout}ms`))
        }

        setTimeout(() => {
          checkReady()
        }, interval)
      }

      checkReady()
    })
  }

  /**
   * Stop the current node and also automatically stop nodes that are stale.
   * Stale nodes are nodes that are running for 2 hours
   */
  async stop(): Promise<void> {
    await this.container?.stop()
    await this.container?.remove()

    return new Promise((resolve, reject) => {
      this.docker.listContainers({all: 1}, (error, result) => {
        if (error) {
          reject(error)
          return
        }
        if (!result) {
          return
        }

        const promises = result
          .filter((containerInfo) => {
            // filter docker container with the same prefix
            return containerInfo.Names.filter((value) => value.startsWith(DeFiChainDocker.PREFIX))
          })
          .filter((containerInfo) => {
            // filter docker container that are created 2 hours ago
            return containerInfo.Created + 60 * 60 * 2 < Date.now() / 1000
          })
          .map(
            async (containerInfo): Promise<void> => {
              const container = this.docker.getContainer(containerInfo.Id)
              if (containerInfo.State === 'running') {
                await container.stop()
              }
              await container.remove()
            }
          )

        Promise.all(promises).finally(resolve)
      })
    })
  }
}
