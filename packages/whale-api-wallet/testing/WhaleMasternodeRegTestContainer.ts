import Dockerode from 'dockerode'
import { GenericContainer, Network, StartedNetwork, StartedTestContainer } from 'testcontainers'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'

/**
 * Whale Masternode RegTest Container setup.
 * This Automatically setup a network and connects ain and whale together.
 *
 * Whale API port 3000 is then bridged over to localhost automatically via getWhaleApiClient().
 */
export class WhaleMasternodeRegTestContainer {
  private readonly docker: Dockerode = new Dockerode()
  public readonly ain: MasterNodeRegTestContainer = new MasterNodeRegTestContainer()
  private whale?: StartedTestContainer
  private network?: StartedNetwork

  async start (): Promise<void> {
    const network = await new Network().start()
    this.network = network

    await this.ain.start({
      user: 'whale',
      password: 'whale'
    })
    await this.docker.getNetwork(network.getId()).connect({ Container: this.ain.id })
    await this.ain.restart()

    const ip = await this.ain.getIp(network.getName())
    this.whale = await new GenericContainer('ghcr.io/defich/whale:0.32.1')
      .withNetworkMode(network.getName())
      .withEnv('WHALE_DEFID_URL', `http://whale:whale@${ip}:19554/`)
      .withEnv('WHALE_DATABASE_PROVIDER', 'level')
      .withEnv('WHALE_DATABASE_LEVEL_LOCATION', '.level/index')
      .withEnv('WHALE_NETWORK', 'regtest')
      .withEnv('WHALE_VERSION', 'v0')
      .withExposedPorts(3000)
      .start()
  }

  async stop (): Promise<void> {
    await Promise.all([
      this.ain.stop(),
      this.whale?.stop()
    ])

    await this.network?.stop()
  }

  /**
   * @return {WhaleApiClient}
   */
  getWhaleApiClient (): WhaleApiClient {
    return new WhaleApiClient({
      url: this.getWhaleApiUrl(),
      version: this.getWhaleApiVersion(),
      network: 'regtest'
    })
  }

  getWhaleApiUrl (): string {
    if (this.whale === undefined) {
      throw new Error('WhaleMasternodeRegTestContainer not yet started.')
    }

    return `http://localhost:${this.whale.getMappedPort(3000)}`
  }

  getWhaleApiVersion (): string {
    return 'v0'
  }
}
