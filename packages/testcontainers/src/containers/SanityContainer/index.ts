import { fetch, Response } from 'cross-fetch'
import * as path from 'path'
import { pack } from 'tar-fs'

import { DockerContainer, hasImageLocally } from '../DockerContainer'
import { MasterNodeRegTestContainer } from '../RegTestContainer/Masternode'

const PROJECT_ROOT = path.resolve(__dirname, '../../../../../')

/**
 * Sanity Container
 *
 * We are running sanity containers seperately from the established unit tests as
 * they are designed to test against a simulated prouduction deployment ensuring
 * our containers are resolving incoming requests as expected.
 *
 * We do however introduce the container environment so that they can be run via
 * unit tests to create uniformity in our approach to testing. Reducing the
 * cognitive complexity of having to run multiple automated solutions to ensure
 * release quality.
 *
 * This solution works by building a new docker image using our root Dockerfile
 * and running instances on random ports to support parallel testing allowing for
 * vertical scaling in our test environments.
 */

export abstract class SanityContainer extends DockerContainer {
  public readonly name = this.generateName()

  constructor (
    public readonly app: string,
    public readonly port = getRandomPort(3000, 5000),
    public readonly blockchain: MasterNodeRegTestContainer = new MasterNodeRegTestContainer()
  ) {
    super(`${app}:sanity`)
  }

  public abstract start (): Promise<void>

  /**
   * Start the blockchain master node and return its hosting details to be used
   * by the sanity containers.
   *
   * @returns Host details
   */
  public async startMasterNode (): Promise<{
    hostRegTestIp: string
    hostRegTestPort: string
  }> {
    await this.blockchain.start()

    const hostRegTestIp = 'host.docker.internal' // TODO(eli-lim): Works on linux?
    const hostRegTestPort = await this.blockchain.getPort('19554/tcp')

    return { hostRegTestIp, hostRegTestPort }
  }

  /**
   * Shuts down and removes any running sanity instance for this session aiming to
   * reduce the amount of lingering docker containers as a result of running tests.
   */
  public async stop (): Promise<void> {
    await this.container?.stop()
    await this.container?.remove({ v: true })
    await this.blockchain.stop()
  }

  /**
   * Builds a new image with a :sanity tag that can be pulled into unit tests and
   * run on the current state of the code base. These steps are required to
   * ensure that we are sanity testing against the current code state and not
   * pre-built solutions which is tested seperately during our standard unit
   * tests.
   *
   * @remarks Images are built with tar
   * @see     https://github.com/apocas/dockerode/issues/432
   */
  public async build (): Promise<void> {
    if (await hasImageLocally(this.image, this.docker)) {
      return // dont rebuild image during testing for concurrent container support
    }
    const image = pack(PROJECT_ROOT)
    const stream = await this.docker.buildImage(image, {
      t: this.image,
      buildargs: {
        APP: this.app
      }
    })
    await new Promise((resolve, reject) => {
      this.docker.modem.followProgress(stream, (err, res) => (err != null) ? reject(err) : resolve(res))
    })
  }

  public generateName (): string {
    const rand = Math.floor(Math.random() * 10000000)
    return `${this.app}-${rand}`
  }

  public async post (endpoint: string, data?: any): Promise<Response> {
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

/**
 * @see https://stackoverflow.com/a/7228322
 */
function getRandomPort (min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min)
}
