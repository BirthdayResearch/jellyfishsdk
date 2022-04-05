import { MasterNodeRegTestContainer } from '../RegTestContainer/Masternode'
import { SanityContainer } from '.'

export class WhaleSanityContainer extends SanityContainer {
  constructor (
    blockchain?: MasterNodeRegTestContainer,
    tag: string = 'local'
  ) {
    super(blockchain, 'whale', tag)
  }

  public async start (): Promise<void> {
    const { blockchain: { ip, port } } = await this.initialize()

    this.container = await this.docker.createContainer({
      name: this.generateName(),
      Image: this.image,
      Tty: true,
      Env: [
        `WHALE_DEFID_URL=http://testcontainers-user:testcontainers-password@${ip}:${port}`,
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
