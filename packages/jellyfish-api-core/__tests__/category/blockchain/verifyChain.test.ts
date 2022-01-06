import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('verifyChain', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForBlockHeight(3)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should return true for a valid chain', async () => {
    await expect(client.blockchain.verifyChain()).resolves.toBeTruthy()
  })
})
