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

  it('should getRpcInfo', async () => {
    const info = await client.server.getRpcInfo()
    expect(info.active_commands[0].method).toStrictEqual('getrpcinfo')
    expect(info.active_commands[0].duration).toBeGreaterThanOrEqual(0)
    expect(typeof info.logpath).toBe('string')
    expect(info.logpath).toContain('regtest/debug.log')
  })
})
