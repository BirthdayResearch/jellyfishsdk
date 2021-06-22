import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'

describe('Account', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should listCommunityBalances', async () => {
    const data = await client.account.listCommunityBalances()

    expect(data.AnchorReward instanceof BigNumber).toStrictEqual(true)
    expect(data.IncentiveFunding instanceof BigNumber).toStrictEqual(true)
    expect(data.Burnt instanceof BigNumber).toStrictEqual(true)
    expect(data.Swap).toBeUndefined()
    expect(data.Futures).toBeUndefined()
    expect(data.Options).toBeUndefined()
    expect(data.Unallocated).toBeUndefined()
    expect(data.Unknown).toBeUndefined()
  })
})
