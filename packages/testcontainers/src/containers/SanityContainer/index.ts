import { fetch, Response } from 'cross-fetch'
import * as path from 'path'
import { pack } from 'tar-fs'

import { DockerContainer, hasImageLocally } from '../DockerContainer'
import { MasterNodeRegTestContainer } from '../RegTestContainer/Masternode'

const PROJECT_ROOT = path.resolve(__dirname, '../../../../../')

export abstract class SanityContainer extends DockerContainer {
  public readonly name = this.generateName()

  constructor (
    public readonly app: string,
    public readonly port = Math.floor(Math.random() * (5000 - 3000 + 1) + 3000),
    public readonly blockchain: MasterNodeRegTestContainer = new MasterNodeRegTestContainer()
  ) {
    super(`${app}:sanity`)
  }

  public async initialize (): Promise<{
    hostRegTestIp: string
    hostRegTestPort: string
  }> {
    if (!await hasImageLocally(this.image, this.docker)) {
      await this.build()
    }

    await this.blockchain.start()

    const hostRegTestIp = 'host.docker.internal' // TODO(eli-lim): Works on linux?
    const hostRegTestPort = await this.blockchain.getPort('19554/tcp')

    return { hostRegTestIp, hostRegTestPort }
  }

  public abstract start (): Promise<void>

  public async stop (): Promise<void> {
    await this.container?.stop()
    await this.container?.remove({ v: true })
    await this.blockchain.stop()
  }

  public async build (): Promise<void> {
    // Build image with tar - see https://github.com/apocas/dockerode/issues/432
    const image = pack(PROJECT_ROOT)
    const stream = await this.docker.buildImage(image, {
      t: this.image,
      buildargs: {
        APP: this.app
      }
    })
    await new Promise((resolve, reject) => {
      this.docker.modem.followProgress(stream,
        (err, res) => (err != null) ? reject(err) : resolve(res),
        console.log)
    })
  }

  public generateName (): string {
    const rand = Math.floor(Math.random() * 10000000)
    return `${this.app}-${rand}`
  }

  public async post (endpoint: string, data: any): Promise<Response> {
    return await this.fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  public async get (endpoint: string): Promise<Response> {
    return await this.fetch(endpoint, {
      method: 'GET'
    })
  }

  public async fetch (endpoint: string, init: RequestInit = {}): Promise<Response> {
    const url = await this.getUrl()
    return await fetch(`${url}${endpoint}`, init)
  }

  public async getUrl (): Promise<string> {
    return `http://127.0.0.1:${this.port}`
  }
}
