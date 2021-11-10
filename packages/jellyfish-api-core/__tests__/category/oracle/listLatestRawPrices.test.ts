import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'
import { OracleRawPriceState } from '../../../src/category/oracle'

describe('Oracle', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterEach(async () => {
    const data = await container.call('listoracles')

    for (let i = 0; i < data.length; i += 1) {
      await container.call('removeoracle', [data[i]])
    }

    await container.generate(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should listLatestRawPrices', async () => {
    const priceFeed1 = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'AAPL', currency: 'USD' }
    ]
    const priceFeed2 = [
      { token: 'TSLA', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    const oracleId1 = await container.call('appointoracle', [await container.getNewAddress(), priceFeed1, 1])
    const oracleId2 = await container.call('appointoracle', [await container.getNewAddress(), priceFeed2, 2])

    await container.generate(1)

    const timestamp1 = Math.floor(new Date().getTime() / 1000)
    const timestamp2 = Math.floor(new Date().getTime() / 1000) + 300

    const prices1 = [{ tokenAmount: '0.5@AAPL', currency: 'EUR' }]
    await container.call('setoracledata', [oracleId1, timestamp1, prices1])

    const prices2 = [{ tokenAmount: '1@AAPL', currency: 'USD' }]
    await container.call('setoracledata', [oracleId1, timestamp1, prices2])

    const prices3 = [{ tokenAmount: '1.5@TSLA', currency: 'EUR' }]
    await container.call('setoracledata', [oracleId2, timestamp2, prices3])

    const prices4 = [{ tokenAmount: '2@TSLA', currency: 'USD' }]
    await container.call('setoracledata', [oracleId2, timestamp2, prices4])

    await container.generate(1)

    // NOTE(jingyi2811): Pagination is not supported.
    const data = await client.oracle.listLatestRawPrices()

    const result1 = data.filter(element => element.oracleid === oracleId1)

    expect(result1).toStrictEqual(
      [
        {
          priceFeeds: { token: 'AAPL', currency: 'EUR' },
          oracleid: oracleId1,
          weightage: new BigNumber(1),
          timestamp: new BigNumber(timestamp1),
          rawprice: new BigNumber(0.5),
          state: OracleRawPriceState.LIVE
        },
        {
          priceFeeds: { token: 'AAPL', currency: 'USD' },
          oracleid: oracleId1,
          weightage: new BigNumber(1),
          timestamp: new BigNumber(timestamp1),
          rawprice: new BigNumber(1),
          state: OracleRawPriceState.LIVE
        }
      ]
    )

    const result2 = data.filter(element => element.oracleid === oracleId2)

    expect(result2).toStrictEqual(
      [
        {
          priceFeeds: { token: 'TSLA', currency: 'EUR' },
          oracleid: oracleId2,
          weightage: new BigNumber(2),
          timestamp: new BigNumber(timestamp2),
          rawprice: new BigNumber(1.5),
          state: OracleRawPriceState.LIVE
        },
        {
          priceFeeds: { token: 'TSLA', currency: 'USD' },
          oracleid: oracleId2,
          weightage: new BigNumber(2),
          timestamp: new BigNumber(timestamp2),
          rawprice: new BigNumber(2),
          state: OracleRawPriceState.LIVE
        }
      ]
    )
  })

  // FIXME(@ivan-zynesis): set price as usual, mock system time to 4200s later and listLatestRawPrices
  it.skip('should listLatestRawPrices for timestamps 4200 seconds before the current time', async () => {
    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), [{
      token: 'AAPL',
      currency: 'EUR'
    }], 1])

    await container.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000) - 4200
    const prices = [{ tokenAmount: '0.5@AAPL', currency: 'EUR' }]
    await container.call('setoracledata', [oracleId, timestamp, prices])

    await container.generate(1)

    // NOTE(jingyi2811): Pagination is not supported.
    const data = await client.oracle.listLatestRawPrices()

    expect(data).toStrictEqual(
      [
        {
          priceFeeds: { token: 'AAPL', currency: 'EUR' },
          oracleid: oracleId,
          weightage: new BigNumber(1),
          timestamp: new BigNumber(timestamp),
          rawprice: new BigNumber(0.5),
          state: OracleRawPriceState.EXPIRED
        }
      ]
    )
  })

  it('should listLatestRawPrices with empty array if there is no oracle appointed', async () => {
    // NOTE(jingyi2811): Pagination is not supported.
    const data = await client.oracle.listLatestRawPrices()

    expect(data.length).toStrictEqual(0)
  })

  it('should listLatestRawPrices with priceFeed as input parameter', async () => {
    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), [{
      token: 'AAPL',
      currency: 'EUR'
    }], 1])

    await container.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    const prices = [{ tokenAmount: '0.5@AAPL', currency: 'EUR' }]
    await container.call('setoracledata', [oracleId, timestamp, prices])

    await container.generate(1)

    // NOTE(jingyi2811): Pagination is not supported.
    const data = await client.oracle.listLatestRawPrices({ token: 'AAPL', currency: 'EUR' })

    expect(data).toStrictEqual(
      [
        {
          priceFeeds: { token: 'AAPL', currency: 'EUR' },
          oracleid: oracleId,
          weightage: new BigNumber(1),
          timestamp: new BigNumber(timestamp),
          rawprice: new BigNumber(0.5),
          state: OracleRawPriceState.LIVE
        }
      ]
    )
  })

  it('should listLatestRawPrices with priceFeed as input parameter if there are 2 oracles with different priceFeeds created', async () => {
    const oracleId1 = await container.call('appointoracle', [await container.getNewAddress(), [{
      token: 'AAPL',
      currency: 'EUR'
    }], 1])
    const oracleId2 = await container.call('appointoracle', [await container.getNewAddress(), [{
      token: 'TSLA',
      currency: 'USD'
    }], 2])

    await container.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)

    const prices1 = [{ tokenAmount: '0.5@AAPL', currency: 'EUR' }]
    await container.call('setoracledata', [oracleId1, timestamp, prices1])

    const prices2 = [{ tokenAmount: '0.5@TSLA', currency: 'USD' }]
    await container.call('setoracledata', [oracleId2, timestamp, prices2])

    await container.generate(1)

    // NOTE(jingyi2811): Pagination is not supported.
    const data = await client.oracle.listLatestRawPrices({ token: 'AAPL', currency: 'EUR' })

    expect(data).toStrictEqual(
      [
        {
          priceFeeds: { token: 'AAPL', currency: 'EUR' },
          oracleid: oracleId1,
          weightage: new BigNumber(1),
          timestamp: new BigNumber(timestamp),
          rawprice: new BigNumber(0.5),
          state: OracleRawPriceState.LIVE
        }
      ]
    )
  })
})
