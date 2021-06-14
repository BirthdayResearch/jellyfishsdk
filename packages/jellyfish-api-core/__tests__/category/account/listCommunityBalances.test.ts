import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { BigNumber } from '@defichain/jellyfish-json'

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

    expect(data.AnchorReward instanceof BigNumber).toStrictEqual(true)
    expect(data.IncentiveFunding instanceof BigNumber).toStrictEqual(true)
    expect(data.Swap instanceof BigNumber).toStrictEqual(false)
    expect(data.Futures instanceof BigNumber).toStrictEqual(false)
    expect(data.Options instanceof BigNumber).toStrictEqual(false)
    expect(data.Unallocated instanceof BigNumber).toStrictEqual(false)
    expect(data.Unknown instanceof BigNumber).toStrictEqual(false)
    expect(data.Burnt instanceof BigNumber).toStrictEqual(true)
  })
})
