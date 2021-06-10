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

  afterAll(async () => {
    await container.stop()
  })

  it('should listLatestRawPrices', async () => {
    const priceFeed1 = [
      { token: 'APPLE', currency: 'EUR' },
      { token: 'APPLE', currency: 'USD' }
    ]
    const priceFeed2 = [
      { token: 'TESLA', currency: 'EUR' },
      { token: 'TESLA', currency: 'USD' }
    ]

    const oracleid1 = await container.call('appointoracle', [await container.getNewAddress(), priceFeed1, 1])
    const oracleid2 = await container.call('appointoracle', [await container.getNewAddress(), priceFeed2, 2])

    await container.generate(1)

    const timestamp1 = Math.floor(new Date().getTime() / 1000)
    const timestamp2 = Math.floor(new Date().getTime() / 1000) + 300

    const prices1 = [{ tokenAmount: '0.5@APPLE', currency: 'EUR' }]
    await container.call('setoracledata', [oracleid1, timestamp1, prices1])

    const prices2 = [{ tokenAmount: '1@APPLE', currency: 'USD' }]
    await container.call('setoracledata', [oracleid1, timestamp1, prices2])

    const prices3 = [{ tokenAmount: '1.5@TESLA', currency: 'EUR' }]
    await container.call('setoracledata', [oracleid2, timestamp2, prices3])

    const prices4 = [{ tokenAmount: '2@TESLA', currency: 'USD' }]
    await container.call('setoracledata', [oracleid2, timestamp2, prices4])

    await container.generate(1)

    // NOTE(jingyi2811): Pagination is not supported.
    const data = await client.oracle.listLatestRawPrices()

    const result1 = data.filter(element => element.oracleid === oracleid1)

    expect(result1).toStrictEqual(
      [
        {
          priceFeeds: priceFeed1[0],
          oracleid: oracleid1,
          weightage: new BigNumber(1),
          timestamp: new BigNumber(timestamp1),
          rawprice: new BigNumber(0.5),
          state: OracleRawPriceState.LIVE
        },
        {
          priceFeeds: priceFeed1[1],
          oracleid: oracleid1,
          weightage: new BigNumber(1),
          timestamp: new BigNumber(timestamp1),
          rawprice: new BigNumber(1),
          state: OracleRawPriceState.LIVE
        }
      ]
    )

    const result2 = data.filter(element => element.oracleid === oracleid2)

    expect(result2).toStrictEqual(
      [
        {
          priceFeeds: priceFeed2[0],
          oracleid: oracleid2,
          weightage: new BigNumber(2),
          timestamp: new BigNumber(timestamp2),
          rawprice: new BigNumber(1.5),
          state: OracleRawPriceState.LIVE
        },
        {
          priceFeeds: priceFeed2[1],
          oracleid: oracleid2,
          weightage: new BigNumber(2),
          timestamp: new BigNumber(timestamp2),
          rawprice: new BigNumber(2),
          state: OracleRawPriceState.LIVE
        }
      ]
    )

    await container.call('removeoracle', [oracleid1])
    await container.call('removeoracle', [oracleid2])

    await container.generate(1)
  })

  it('should listLatestRawPrices with various timestamps', async () => {
    const priceFeed = { token: 'APPLE', currency: 'EUR' }

    const oracleid1 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeed], 1])
    const oracleid2 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeed], 2])
    const oracleid3 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeed], 3])
    const oracleid4 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeed], 4])
    const oracleid5 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeed], 5])

    await container.generate(1)

    // NOTE(jingyi2811): Set to current time.
    const timestamp1 = Math.floor(new Date().getTime() / 1000)
    const prices1 = [{ tokenAmount: '0.5@APPLE', currency: 'EUR' }]
    await container.call('setoracledata', [oracleid1, timestamp1, prices1])

    // NOTE(jingyi2811): Set to 1 second before 1 hour later.
    const timestamp2 = Math.floor(new Date().getTime() / 1000) + 3599
    const prices2 = [{ tokenAmount: '1.0@APPLE', currency: 'EUR' }]
    await container.call('setoracledata', [oracleid2, timestamp2, prices2])

    // NOTE(jingyi2811): Set to 1 hour later.
    const timestamp3 = Math.floor(new Date().getTime() / 1000) + 3600
    const prices3 = [{ tokenAmount: '1.5@APPLE', currency: 'EUR' }]
    await container.call('setoracledata', [oracleid3, timestamp3, prices3])

    // NOTE(jingyi2811): Set to 1 second after 1 hour before.
    const timestamp4 = Math.floor(new Date().getTime() / 1000) - 3599
    const prices4 = [{ tokenAmount: '2.0@APPLE', currency: 'EUR' }]
    await container.call('setoracledata', [oracleid4, timestamp4, prices4])

    // NOTE(jingyi2811): Set to 1 hour before.
    const timestamp5 = Math.floor(new Date().getTime() / 1000) - 3600
    const prices5 = [{ tokenAmount: '2.5@APPLE', currency: 'EUR' }]
    await container.call('setoracledata', [oracleid5, timestamp5, prices5])

    await container.generate(1)

    // NOTE(jingyi2811): Pagination is not supported.
    const data = await client.oracle.listLatestRawPrices()

    expect(data.length).toStrictEqual(5)

    const result1 = data.find(element => element.oracleid === oracleid1)

    expect(result1).toStrictEqual(
      {
        priceFeeds: priceFeed,
        oracleid: oracleid1,
        weightage: new BigNumber(1),
        timestamp: new BigNumber(timestamp1),
        rawprice: new BigNumber(0.5),
        state: OracleRawPriceState.LIVE
      })

    const result2 = data.find(element => element.oracleid === oracleid2)

    expect(result2).toStrictEqual(
      {
        priceFeeds: priceFeed,
        oracleid: oracleid2,
        weightage: new BigNumber(2),
        timestamp: new BigNumber(timestamp2),
        rawprice: new BigNumber(1),
        state: OracleRawPriceState.LIVE
      })

    const result3 = data.find(element => element.oracleid === oracleid3)

    expect(result3).toStrictEqual(
      {
        priceFeeds: priceFeed,
        oracleid: oracleid3,
        weightage: new BigNumber(3),
        timestamp: new BigNumber(timestamp3),
        rawprice: new BigNumber(1.5),
        state: OracleRawPriceState.EXPIRED
      })

    const result4 = data.find(element => element.oracleid === oracleid4)

    expect(result4).toStrictEqual(
      {
        priceFeeds: priceFeed,
        oracleid: oracleid4,
        weightage: new BigNumber(4),
        timestamp: new BigNumber(timestamp4),
        rawprice: new BigNumber(2),
        state: OracleRawPriceState.LIVE
      })

    const result5 = data.find(element => element.oracleid === oracleid5)

    expect(result5).toStrictEqual(
      {
        priceFeeds: priceFeed,
        oracleid: oracleid5,
        weightage: new BigNumber(5),
        timestamp: new BigNumber(timestamp5),
        rawprice: new BigNumber(2.5),
        state: OracleRawPriceState.EXPIRED
      })

    await container.call('removeoracle', [oracleid1])
    await container.call('removeoracle', [oracleid2])
    await container.call('removeoracle', [oracleid3])
    await container.call('removeoracle', [oracleid4])
    await container.call('removeoracle', [oracleid5])

    await container.generate(1)
  })

  it('should listLatestRawPrices with empty array if there is no oracle appointed', async () => {
    // NOTE(jingyi2811): Pagination is not supported.
    const data = await client.oracle.listLatestRawPrices()

    expect(data.length).toStrictEqual(0)
  })

  it('should listLatestRawPrices with priceFeed as input parameter', async () => {
    const priceFeed = { token: 'APPLE', currency: 'EUR' }

    const oracleid = await container.call('appointoracle', [await container.getNewAddress(), [priceFeed], 1])

    await container.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    const prices = [{ tokenAmount: '0.5@APPLE', currency: 'EUR' }]
    await container.call('setoracledata', [oracleid, timestamp, prices])

    await container.generate(1)

    // NOTE(jingyi2811): Pagination is not supported.
    const data = await client.oracle.listLatestRawPrices(priceFeed)

    expect(data).toStrictEqual(
      [
        {
          priceFeeds: priceFeed,
          oracleid,
          weightage: new BigNumber(1),
          timestamp: new BigNumber(timestamp),
          rawprice: new BigNumber(0.5),
          state: OracleRawPriceState.LIVE
        }
      ]
    )
  })
})
