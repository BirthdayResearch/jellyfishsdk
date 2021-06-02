import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'

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

  it('should getRpcInfo', async () => {
    await waitForExpect(async () => {
      const info = await client.server.getRpcInfo()
      expect(info.active_commands.length).toBeGreaterThan(0)
    })
  })
})

describe('Server not on masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getRpcInfo', async () => {
    await waitForExpect(async () => {
      const info = await client.server.getRpcInfo()
      expect(info.active_commands.length).toBeGreaterThan(0)
    })
  })
})
