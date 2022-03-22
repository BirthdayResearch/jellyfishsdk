import {
  GenericContainer,
  Network,
  StartedTestContainer
} from 'testcontainers'

export interface DockerOptions {
  username?: string | undefined
  timeout?: number | undefined
}
export interface DockerNetworkInfo {
  id: string
  name: string
}
export interface DockerContainerInfo {
  id: string
  name: string
  host: string
  networks: DockerNetworkInfo[]
}

export abstract class DockerContainer {
  protected docker: GenericContainer
  protected container?: StartedTestContainer

  protected constructor (
    protected readonly image: string,
    options?: DockerOptions
  ) {
    this.docker = new GenericContainer(image)
    if (options !== undefined) {
      if (options?.username !== undefined) {
        this.docker.withUser(options.username)
      }
      if (options?.timeout !== undefined) {
        this.docker.withStartupTimeout(options.timeout)
      }
    }
  }

  protected async _startContainer (): Promise<void> {
    this.container = await this.docker.start()
  }

  protected async _stopContainer (): Promise<void> {
    await this.requireContainer().stop()
    this.container = undefined
  }

  get id (): string {
    return this.requireContainer().getId()
  }

  getIp (name = 'default'): string {
    return this.requireContainer().getIpAddress(name)
  }

  listNetworks (): DockerNetworkInfo[] {
    return this.requireContainer().getNetworkNames().map((name) => ({
      name,
      id: this.requireContainer().getNetworkId(name)
    }))
  }

  async getNetwork (id: string): Promise<DockerNetworkInfo | undefined> {
    return this.listNetworks().find(network => network.id === id)
  }

  async createNetwork (name: string): Promise<string> {
    const network = await new Network({ name }).start()
    return network.getId()
  }

  async connectNetwork (networkName: string): Promise<void> {
    this.docker.withNetworkMode(networkName)
  }

  /**
   * Require container, else error exceptionally.
   * Not a clean design, but it keep the complexity of this implementation low.
   */
  protected requireContainer (): StartedTestContainer {
    if (this.container === undefined) {
      throw new Error('container not yet started')
    }
    return this.container
  }

  /**
   * Get host machine port
   *
   * @param {number} port
   */
  getPort (port: number): number {
    const container = this.requireContainer()
    return container.getMappedPort(port)
  }

  /**
   * tty into docker
   */
  async exec (cmds: string[]): Promise<void> {
    const container = this.requireContainer()
    await container.exec(cmds)
  }

  /**
   * Inspect docker container info
   *
   * @return {Promise<DockerContainerInfo>}
   */
  async inspect (): Promise<DockerContainerInfo> {
    const container = this.requireContainer()
    return {
      id: container.getId(),
      name: container.getName(),
      host: container.getHost(),
      networks: this.listNetworks()
    }
  }
}
