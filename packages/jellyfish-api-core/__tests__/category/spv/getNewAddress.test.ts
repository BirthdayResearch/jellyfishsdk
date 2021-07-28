import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Spv', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getNewAddress', async () => {
    const address = await client.spv.getNewAddress()

    expect(typeof address).toStrictEqual('string')
    expect(address.length).toStrictEqual(44)
  })
})
