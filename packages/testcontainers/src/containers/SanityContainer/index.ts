import fetch from 'cross-fetch'
import Dockerode from 'dockerode'
import * as path from 'path'
import { pack } from 'tar-fs'

import { DockerContainer, hasImageLocally } from '../DockerContainer'
import { MasterNodeRegTestContainer } from '../RegTestContainer/Masternode'

const PROJECT_ROOT = path.resolve(__dirname, '../../../../../')

export class SanityContainer extends DockerContainer {
  constructor (
    public readonly blockchain: MasterNodeRegTestContainer,
    public readonly app: string,
    public readonly tag: string
  ) {
    super(`${app}:${tag}`)
  }

  public async start (): Promise<void> {
    if (!await hasImageLocally(this.image, this.docker)) {
      await buildLocalImage(this.app, this.image, this.docker)
    }
    await this.blockchain.start()
    await this.blockchain.generate(3)
  }

  public async stop (): Promise<void> {
    await this.blockchain.stop()
    await this.container?.stop()
    await this.container?.remove({ v: true })
  }

  public generateName (): string {
    const rand = Math.floor(Math.random() * 10000000)
    return `${this.app}-${rand}`
  }

  async post<T = any>(endpoint: string, data: any): Promise<T> {
    return await this.fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async get<T = any>(endpoint: string): Promise<T> {
    return await this.fetch(endpoint, {
      method: 'GET'
    })
  }

  public async fetch (endpoint: string, init: RequestInit = {}): Promise<any> {
    const url = await this.getUrl()
    const res = await fetch(`${url}${endpoint}`, init)
    return await res.json()
  }

  public async getUrl (): Promise<string> {
    const ip = await this.getIp('bridge')
    return `http://${ip}:3000`
  }
}

async function buildLocalImage (app: string, imageName: string, docker: Dockerode): Promise<void> {
  // Build image with tar - see https://github.com/apocas/dockerode/issues/432
  const _pack = pack(PROJECT_ROOT)
  const stream = await docker.buildImage(_pack, {
    t: imageName,
    buildargs: {
      APP: app
    }
  })
  await new Promise((resolve, reject) => {
    docker.modem.followProgress(stream,
      (err, res) => (err != null) ? reject(err) : resolve(res),
      console.log)
  })
}
