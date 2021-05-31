import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Network without masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getConnectionCount', async () => {
    const count = await client.net.getConnectionCount()
    expect(count).toBeGreaterThanOrEqual(0)
  })
})

describe('Network on masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getConnectionCount', async () => {
    const count = await client.net.getConnectionCount()
    expect(count).toBeGreaterThanOrEqual(0)
  })
})
