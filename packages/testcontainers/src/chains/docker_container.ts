import Dockerode, { Container, DockerOptions } from 'dockerode'

export abstract class DockerContainer {
  protected readonly docker: Dockerode
  protected container?: Container

  protected constructor (
    protected readonly image: string,
    options?: DockerOptions
  ) {
    this.docker = new Dockerode(options)
  }

  get id (): string {
    return this.requireContainer().id
  }

  async getIp (name = 'default'): Promise<string> {
    const { NetworkSettings: networkSettings } = await this.inspect()
    const { Networks: networks } = networkSettings
    return networks[name].IPAddress
  }

  /**
   * Try pull docker image if it doesn't already exist.
   */
  protected async tryPullImage (): Promise<void> {
    if (await hasImageLocally(this.image, this.docker)) {
      return
    }

    /* istanbul ignore next */
    return await new Promise((resolve, reject) => {
      this.docker.pull(this.image, {}, (error, result) => {
        if (error instanceof Error) {
          reject(error)
          return
        }
        this.docker.modem.followProgress(result, () => {
          resolve()
        })
      })
    })
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
   * Get host machine port
   *
   * @param {string} name of ExposedPorts e.g. '80/tcp'
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
            .then(() => setTimeout(resolve, 100)) // to prevent stream race condition
            .catch(reject)
        }
      })
    })
  }

  /**
   * Inspect docker container info
   *
   * @return {Promise<Record<string, any>>}
   */
  async inspect (): Promise<Record<string, any>> {
    const container = this.requireContainer()
    return await container.inspect()
  }
}

async function hasImageLocally (image: string, docker: Dockerode): Promise<boolean> {
  return await new Promise((resolve, reject) => {
    docker.getImage(image).inspect((error, result) => {
      resolve(!(error instanceof Error))
    })
  })
}
