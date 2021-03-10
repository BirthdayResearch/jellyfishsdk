import { ContainerAdapterClient } from '../container_adapter_client'
import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { BigNumber } from '../../src/core'
import waitForExpect from 'wait-for-expect'

describe('non masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getBalance = 0', async () => {
    const balance: BigNumber = await client.wallet.getBalance()

    expect(balance.toString()).toBe('0')
  })
})

describe('masternode', () => {
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

  it('should getBalance >= 100', async () => {
    return await waitForExpect(async () => {
      const balance: BigNumber = await client.wallet.getBalance()
      expect(balance.isGreaterThan(new BigNumber('100'))).toBe(true)
    })
  })
})
