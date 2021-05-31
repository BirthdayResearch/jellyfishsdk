import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { BigNumber } from '../../../src'

describe('Balance without masternode', () => {
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
    expect(balance.toString()).toStrictEqual('0')
  })
})

describe('Balance on masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(100)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getBalance >= 100', async () => {
    const balance: BigNumber = await client.wallet.getBalance()
    expect(balance.isGreaterThan(new BigNumber('100'))).toStrictEqual(true)
  })
})
