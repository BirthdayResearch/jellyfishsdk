import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Network', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start({
      startFlags: [
        {
          name: 'regtest',
          value: 0
        },
        {
          name: 'testnet',
          value: 1
        },
        {
          name: 'rpcport',
          value: 19554
        }
      ]
    }, false)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should be empty if no available nodes', async () => {
    const res = await client.net.getNodeAddresses(1)
    expect(res).toMatchObject([])
  })

  it('should have available nodes', async () => {
    // mydeficha.in nodes
    await container.call('addnode', ['89.58.14.177:18555', 'add'])
    await container.call('addnode', ['89.58.26.201:18555', 'add'])
    await container.call('addnode', ['89.58.14.115:18555', 'add'])
    await container.call('addnode', ['178.254.26.173:18555', 'add'])
    await container.call('addnode', ['178.254.13.34:18555', 'add'])
    await container.call('addnode', ['154.53.43.103:18555', 'add'])
    await container.call('addnode', ['161.97.90.159:18555', 'add'])
    await container.call('addnode', ['194.233.89.209:18555', 'add'])
    await container.call('addnode', ['89.163.215.205:18555', 'add'])

    await new Promise((resolve) => {
      setTimeout(() => resolve(0), 10000)
    }) // give enough time to find new nodes

    const res = await client.net.getNodeAddresses(1)
    expect(res).toMatchObject([{
      time: expect.any(Number),
      services: expect.any(Number),
      address: expect.any(String),
      port: expect.any(Number)
    }])
  })
})
