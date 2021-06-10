import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Account', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should listCommunityBalances', async () => {
    const data = await client.account.listCommunityBalances()

    expect(data.AnchorReward).toBeGreaterThanOrEqual(0)
    expect(data.IncentiveFunding).toBeGreaterThanOrEqual(0)
    expect(data.Burnt).toBeGreaterThanOrEqual(0)
  })
})
