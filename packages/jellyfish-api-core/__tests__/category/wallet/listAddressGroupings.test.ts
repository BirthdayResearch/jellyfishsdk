import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'
import BigNumber from 'bignumber.js'

describe('Address without masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should listAddressGroupings', async () => {
    return await waitForExpect(async () => {
      const data = await client.wallet.listAddressGroupings()

      expect(data.length === 0).toStrictEqual(true)
    })
  })
})

describe('Address on masternode', () => {
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

  it('should listAddressGroupings', async () => {
    return await waitForExpect(async () => {
      const data = await client.wallet.listAddressGroupings()

      expect(data[0][0][0]).toStrictEqual('mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy')
      expect(data[0][0][1] instanceof BigNumber).toStrictEqual(true)
      expect(data[0][0][1].isGreaterThanOrEqualTo(new BigNumber('0'))).toStrictEqual(true)
      expect(data[0][0][2]).toStrictEqual('operator')

      expect(data[1][0][0]).toStrictEqual('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU')
      expect(data[1][0][1] instanceof BigNumber).toStrictEqual(true)
      expect(data[1][0][1].isGreaterThanOrEqualTo(new BigNumber('0'))).toStrictEqual(true)
      expect(data[1][0][2]).toStrictEqual('operator')
    })
  })
})
