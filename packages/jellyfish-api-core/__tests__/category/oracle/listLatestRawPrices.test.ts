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

  it('should listLatestRawPrices', async () => {
    const priceFeeds = [
      { token: 'APPLE', currency: 'EUR' }
    ]

    const oracleid1 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])
    const oracleid2 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 2])

    await container.generate(1)

    const timestamp1 = new Date().getTime()
    const prices1 = [{ tokenAmount: '0.5@APPLE', currency: 'EUR' }]
    await container.call('setoracledata', [oracleid1, timestamp1, prices1])

    const timestamp2 = new Date().getTime()
    const prices2 = [{ tokenAmount: '1.0@APPLE', currency: 'EUR' }]
    await container.call('setoracledata', [oracleid2, timestamp2, prices2])

    await container.generate(1)

    const data = await client.oracle.listLatestRawPrices(priceFeeds[0])

    expect(data).toStrictEqual([
      {
        priceFeeds: priceFeeds[0],
        oracleid: oracleid1,
        weightage: 1,
        timestamp: timestamp1,
        rawprice: 0.5,
        state: 'expired'
      },
      {
        priceFeeds: priceFeeds[0],
        oracleid: oracleid2,
        weightage: 2,
        timestamp: timestamp2,
        rawprice: 1.0,
        state: 'expired'
      }
    ])
  })

  // it('should not listLatestRawPrices if token and currency do not exists', async () => {
  //   const data = await client.oracle.listLatestRawPrices( { token: 'TESLA', currency: 'USD' })
  //   expect(data.length).toStrictEqual(0)
  // })
})
