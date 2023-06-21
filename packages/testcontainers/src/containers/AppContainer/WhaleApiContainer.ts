import { GenericContainer, StartedNetwork, AbstractStartedContainer } from 'testcontainers'
import { waitForCondition } from '../../utils'
import { StartedNativeChainContainer } from '../NativeChainContainer'
import fetch from 'cross-fetch'

// eslint-disable-next-line
// @ts-ignore because `package.json` will always be available in the root of pnpm package
import packageJson from '../../../package.json'

const WHALE_API_PORT = 3000

/**
 * For local environment, `:latest` tag will be used as there isn't pipeline to automatically rebuild image locally.
 */
const WHALE_VERSION = packageJson.version === '0.0.0' ? 'latest' : packageJson.version

export class WhaleApiContainer extends GenericContainer {
  constructor (image: string = `ghcr.io/birthdayresearch/whale-api:${WHALE_VERSION}`) {
    super(image)
    this.withExposedPorts(WHALE_API_PORT).withStartupTimeout(120_000)
  }

  public withNativeChain (
    container: StartedNativeChainContainer,
    network: StartedNetwork
  ): this {
    const ipAddress = container.getIpAddress(network.getName())
    this.withEnvironment({
      WHALE_DEFID_URL: `http://${container.rpcUser}:${container.rpcPassword}@${ipAddress}:19554/`,
      WHALE_DATABASE_PROVIDER: 'level',
      WHALE_DATABASE_LEVEL_LOCATION: '.level/index',
      WHALE_NETWORK: 'regtest',
      WHALE_VERSION: 'v0'
    })
    return this
  }

  public async start (): Promise<StartedWhaleApiContainer> {
    return new StartedWhaleApiContainer(await super.start())
  }
}

export class StartedWhaleApiContainer extends AbstractStartedContainer {
  public getContainerPort (): number {
    return WHALE_API_PORT
  }

  public getPort (): number {
    return this.getMappedPort(this.getContainerPort())
  }

  getEndpoint (): string {
    return `http://localhost:${this.getPort()}`
  }

  getWhaleApiClientOptions (): { url: string, version: 'v0', network: 'regtest' } {
    return {
      url: this.getEndpoint(),
      version: 'v0',
      network: 'regtest'
    }
  }

  async waitForIndexedBlockHeight (height: number, timeout: number = 590000): Promise<void> {
    const url = `${this.getEndpoint()}/v0/regtest/blocks?size=1`

    return await waitForCondition(async () => {
      const response = await fetch(url, {
        method: 'GET'
      })
      const { data } = await response.json()
      return data[0].height > height
    }, timeout, 200, 'waitForIndexedBlockHeight')
  }
}
