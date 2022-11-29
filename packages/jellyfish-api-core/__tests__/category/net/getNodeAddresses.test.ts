import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Network on masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start({
      startFlags: [
        {
          name: '-regtest',
          value: 0
        },
        {
          name: '-testnet',
          value: 1
        },
        {
          name: '-rpcport',
          value: 19554
        }
      ]
    }, false)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should get something in the array', async () => {
    // await setTimeout(50000);
    console.log(await container.call('getpeerinfo'))
    console.log(await container.call('getnetworkinfo'))
    const info = await client.net.getNodeAddresses()
    console.log(info)
  })
})
