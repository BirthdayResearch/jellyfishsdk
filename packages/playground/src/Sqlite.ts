import { createConnection, EntityTarget, getManager } from 'typeorm'
import Dockerode, { Container } from 'dockerode'
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

  constructor () {
    this.docker = new Dockerode()
  }

  async start (...schemas: Function[]): Promise<void> {
    // await this.tryPullImage()
    // this.container = await this.docker.createContainer({
    //   name: 'test',
    //   Image: this.image,
    //   Tty: true,
    //   HostConfig: {
    //     PublishAllPorts: true
    //   }
    // })
    // await this.container.start()

    const conn = await createConnection({
      type: 'sqlite',
      database: './database.sqlite',
      entities: [...schemas],
      synchronize: true
    })
    await conn.synchronize(true)
    console.log(conn)
  }

  async stop (): Promise<void> {
    await this.container?.stop()
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

  // async list<T extends HeightIndexedModel> (type: EntityTarget<T>): Promise<T[]> {
  //   return getManager().find(type)
  // }

  async list<T extends any> (type: EntityTarget<T>): Promise<T[]> {
    return await getManager().find(type)
  }

  async insert<T> (type: EntityTarget<T>, data: T): Promise<void> {
    await getManager().save(type, data)
  }
}
