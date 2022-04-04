import { MasterNodeRegTestContainer } from '../RegTestContainer/Masternode'
import { SanityContainer } from '.'

export class WhaleSanityContainer extends SanityContainer {
  constructor (master: MasterNodeRegTestContainer = new MasterNodeRegTestContainer(), tag: string = 'local') {
    super(master, 'whale', tag)
  }

  public async start (): Promise<void> {
    await super.start()

    const ip = await this.blockchain.getIp('bridge')

    this.container = await this.docker.createContainer({
      name: this.generateName(),
      Image: this.image,
      Tty: true,
      Env: [
        `WHALE_DEFID_URL=http://whale-rpcuser:whale-rpcpassword@${ip}:19554`,
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
