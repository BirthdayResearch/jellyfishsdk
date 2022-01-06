import { Entity, EntityTarget, getConnectionManager, getManager, ObjectType } from 'typeorm'
import Dockerode, { Container, DockerOptions } from 'dockerode'
// import { HeightIndexedModel } from 'apps/ocean-api/src/models/_abstract'

// export interface DatabaseContainer {
//   start() : Promise<void>
//   insert<T extends HeightIndexedModel> (data: T): Promise<void>
//   list<T extends HeightIndexedModel> (type: EntityTarget<T>): Promise<T[]>
// }

export class Sqlite {
  image = 'keinos/sqlite3:latest'
  docker: Dockerode
  container?: Container

  constructor() {
    this.docker = new Dockerode()
  }

  async start (): Promise<void> {
    await this.tryPullImage()
    this.container = await this.docker.createContainer({
      name: 'test',
      Image: this.image,
      Tty: true,
      HostConfig: {
        PublishAllPorts: true
      }
    })
    await this.container.start()
  }

  protected async tryPullImage (): Promise<void> {
    if (await this.hasImageLocally()) {
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

  async hasImageLocally (): Promise<boolean> {
    return await new Promise((resolve, reject) => {
      this.docker.getImage(this.image).inspect((error, result) => {
        resolve(!(error instanceof Error))
      })
    })
  }

  async list<T extends HeightIndexedModel> (type: EntityTarget<T>): Promise<T[]> {
    return getManager().find(type)
  }

  async insert () {

  }
}
