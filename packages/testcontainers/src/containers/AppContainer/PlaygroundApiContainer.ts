import { GenericContainer, StartedNetwork, AbstractStartedContainer } from 'testcontainers'
import { waitForCondition } from '../../utils'
import { StartedNativeChainContainer } from '../NativeChainContainer'
import fetch from 'cross-fetch'

// eslint-disable-next-line
// @ts-ignore because `package.json` will always be available in the root of pnpm package
import packageJson from '../../../package.json'

/**
 * For local environment, `:latest` tag will be used as there isn't pipeline to automatically rebuild image locally.
 */
const PLAYGROUND_VERSION = packageJson.version === '0.0.0' ? 'latest' : packageJson.version

const PLAYGROUND_API_PORT = 3000

export class PlaygroundApiContainer extends GenericContainer {
  constructor (image: string = `ghcr.io/birthdayresearch/playground-api:${PLAYGROUND_VERSION}`) {
    super(image)
    this.withExposedPorts(PLAYGROUND_API_PORT).withStartupTimeout(120_000)
  }

  public withNativeChain (
    container: StartedNativeChainContainer,
    network: StartedNetwork
  ): this {
    const ipAddress = container.getIpAddress(network.getName())
    this.withEnvironment({
      PLAYGROUND_DEFID_URL: `http://${container.rpcUser}:${container.rpcPassword}@${ipAddress}:19554/`
    })
    return this
  }

  public async start (): Promise<StartedPlaygroundApiContainer> {
    return new StartedPlaygroundApiContainer(await super.start())
  }
}

export class StartedPlaygroundApiContainer extends AbstractStartedContainer {
  public getContainerPort (): number {
    return PLAYGROUND_API_PORT
  }

  public getPort (): number {
    return this.getMappedPort(this.getContainerPort())
  }

  getEndpoint (): string {
    return `http://localhost:${this.getPort()}`
  }

  getPlaygroundApiClientOptions (): { url: string, version: 'v0' } {
    return {
      url: this.getEndpoint(),
      version: 'v0'
    }
  }

  async waitForReady (timeout: number = 590000): Promise<void> {
    const url = `${this.getEndpoint()}/_actuator/probes/readiness`

    return await waitForCondition(async () => {
      const response = await fetch(url, {
        method: 'GET'
      })
      const { data } = await response.json()
      return data.details.playground.status === 'up'
    }, timeout, 200, 'waitForReady')
  }
}
