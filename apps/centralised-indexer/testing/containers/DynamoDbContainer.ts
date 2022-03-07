import Dockerode, { ContainerInfo, DockerOptions } from 'dockerode'
import { DockerContainer } from '@defichain/testcontainers'
import * as AWS from 'aws-sdk'

/**
 * Dynamodb managed in docker. Also exposes a connection
 * to the database, so data can be pulled for testing.
 */
export class DynamoDbContainer extends DockerContainer {
  public static readonly PREFIX = 'defichain-apps-dynamodb-'

  dynamoDb!: AWS.DynamoDB

  public static get image (): string {
    if (process?.env?.DYNAMODB_DOCKER_IMAGE !== undefined) {
      return process.env.DYNAMODB_DOCKER_IMAGE
    }
    return 'amazon/dynamodb-local:1.18.0'
  }

  /**
   * @param {string} image docker image name
   * @param {DockerOptions} options
   */
  constructor (
    protected readonly image: string = DynamoDbContainer.image,
    options?: DockerOptions
  ) {
    super(image, options)
  }

  /**
   * Create dynamodb container and start it immediately
   */
  async start (): Promise<void> {
    await this.tryPullImage()
    this.container = await this.docker.createContainer({
      name: this.generateName(),
      Image: this.image,
      Tty: true,
      HostConfig: {
        PublishAllPorts: true
      }
    })
    await this.container.start()
    this.initDynamoDbClient(await this.getHostPort())
  }

  /**
   * Get the host port bridged to the dynamodb instance running in the container
   */
  async getHostPort (): Promise<string> {
    return await this.getPort('8000/tcp')
  }

  generateName (): string {
    const rand = Math.floor(Math.random() * 10000000)
    return `${DynamoDbContainer.PREFIX}-${rand}`
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
        await cleanUpStale(DynamoDbContainer.PREFIX, this.docker)
      }
    }
  }

  async listTables (): Promise<AWS.DynamoDB.Types.ListTablesOutput> {
    return await this.dynamoDb.listTables().promise()
  }

  private initDynamoDbClient (hostPort: string): void {
    this.dynamoDb = new AWS.DynamoDB({
      endpoint: `http://localhost:${hostPort}`,
      region: 'dummy',
      credentials: {
        accessKeyId: 'dummy',
        secretAccessKey: 'dummy'
      }
    })
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
