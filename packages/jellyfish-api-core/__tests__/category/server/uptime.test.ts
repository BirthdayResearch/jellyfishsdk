import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Server on masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should get uptime', async () => {
    const uptime = await client.server.uptime()
    expect(typeof uptime).toBe('number')
    expect(uptime).toBeGreaterThanOrEqual(0)
  })
})
