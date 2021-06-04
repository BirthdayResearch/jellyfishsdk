import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Oracle', () => {
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

  it('should listOracleData', async () => {
    const priceFeeds = [
      { token: 'APPLE', currency: 'EUR' },
      { token: 'TESLA', currency: 'USD' }
    ]

    const oracleid1 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])
    const oracleid2 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    const data = await client.oracle.listOracles()

    expect(data.length).toStrictEqual(2)
    expect(data[0]).toStrictEqual(oracleid1)
    expect(data[1]).toStrictEqual(oracleid2)
  })

  it('should listOracleData with empty result if there is no oracle created before', async () => {
    const data = await client.oracle.listOracles()
    expect(data.length).toStrictEqual(0)
  })
})
