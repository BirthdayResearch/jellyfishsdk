import { MasterNodeRegTestContainer } from '../RegTestContainer/Masternode'
import { SanityContainer } from '.'

export class WhaleSanityContainer extends SanityContainer {
  constructor (
    readonly master: MasterNodeRegTestContainer = new MasterNodeRegTestContainer(),
    tag: string = 'local'
  ) {
    super(master, 'whale', tag)
  }

  public async start (): Promise<void> {
    await super.start()

    const hostRegTestIp = 'host.docker.internal' // TODO(eli-lim): Works on linux?
    const hostRegTestPort = await this.master.getPort('19554/tcp')

    this.container = await this.docker.createContainer({
      name: this.generateName(),
      Image: this.image,
      Tty: true,
      Env: [
        `WHALE_DEFID_URL=http://testcontainers-user:testcontainers-password@${hostRegTestIp}:${hostRegTestPort}`,
        'WHALE_NETWORK=regtest',
        'WHALE_DATABASE_PROVIDER=memory'
      ],
      HostConfig: {
        PublishAllPorts: true
      }
    })

    await this.container?.start()
  }
}
