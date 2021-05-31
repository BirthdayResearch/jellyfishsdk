import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'

describe('Mining without masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getNetworkHashPerSecond', async () => {
    const result = await client.mining.getNetworkHashPerSecond()
    expect(result).toStrictEqual(0)
  })
})

describe('Mining on masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getNetworkHashPerSecond', async () => {
    return await waitForExpect(async () => {
      const result = await client.mining.getNetworkHashPerSecond()
      expect(result).toBeGreaterThan(0)
    })
  })
})
