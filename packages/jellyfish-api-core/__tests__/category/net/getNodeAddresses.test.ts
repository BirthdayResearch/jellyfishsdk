import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Network on masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)
  const group = TestingGroup.create(2)

  beforeAll(async () => {
    await container.start()
    await group.start()
  })

  afterAll(async () => {
    await container.stop()
    await group.stop()
  })

  it('should get something in the array', async () => {
    const address = await container.getNewAddress()
    await container.addNode(address)

    const info = await client.net.getNodeAddresses(1)
    console.log(info)
  })
})
