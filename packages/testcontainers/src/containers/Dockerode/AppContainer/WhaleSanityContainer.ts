import { MasterNodeRegTestContainer } from '../RegTestContainer/Masternode'
import { AppContainer } from '.'
import { waitForCondition } from '../../../utils'

export class WhaleSanityContainer extends AppContainer {
  constructor (port?: number, blockchain?: MasterNodeRegTestContainer) {
    super('whale-api', port, blockchain)
  }

  /**
   * Start the whale container by initiating a build procedure, instantiate the
   * underlying blockchain node, and create a container instance to send sanity
   * requests to.
   *
   * We provide the blockchain node ip and port to the internal whale configuration
   * which links it to the node allowing it to hit the chain with RPC requests.
   *
   * @remarks
   *
   * The method performs a wait for condition to ensure the container is ready
   * before the start method is considered resolved. Otherwise the unit tests
   * will run before the container is ready which can result in various network
   * or request errors.
   */
  public async start (): Promise<void> {
    const { hostRegTestIp, hostRegTestPort } = await this.startMasterNode()

    this.container = await this.docker.createContainer({
      name: this.name,
      Image: this.image,
      Tty: true,
      Env: [
        `WHALE_DEFID_URL=http://testcontainers-user:testcontainers-password@${hostRegTestIp}:${hostRegTestPort}`,
        'WHALE_NETWORK=regtest',
        'WHALE_DATABASE_PROVIDER=memory'
      ],
      ExposedPorts: { '3000/tcp': {} },
      HostConfig: {
        PortBindings: { '3000/tcp': [{ HostPort: this.port.toString() }] },
        PublishAllPorts: true
      }
    })

    await this.container.start()

    await waitForCondition(async () => {
      const res = await this.get('/_actuator/probes/liveness')
      return res.status === 200
    }, 300_000) // 5m
  }

  public async call (rpcEndpoint: string, method: string, params?: any): Promise<Response> {
    return await this.fetch(rpcEndpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        method: method,
        params: params
      })
    })
  }
}
