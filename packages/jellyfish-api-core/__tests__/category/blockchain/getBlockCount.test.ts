import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'

describe('BlockCount', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getBlockCount', async () => {
    await waitForExpect(async () => {
      const info = await client.blockchain.getBlockchainInfo()
      expect(info.blocks).toBeGreaterThan(1)
    })

    const blockCount: number = await client.blockchain.getBlockCount()
    expect(blockCount).toBeGreaterThanOrEqual(2)
  })
})
