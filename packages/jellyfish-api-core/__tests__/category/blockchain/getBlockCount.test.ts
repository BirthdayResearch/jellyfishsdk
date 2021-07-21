import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

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
    await container.generate(3)
    const blockCount: number = await client.blockchain.getBlockCount()
    expect(blockCount).toBeGreaterThanOrEqual(2)
  })
})
