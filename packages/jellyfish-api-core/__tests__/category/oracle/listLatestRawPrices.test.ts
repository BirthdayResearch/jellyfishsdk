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
          priceFeeds: { token: 'APPLE', currency: 'EUR' },
          oracleid: oracleid1,
          weightage: new BigNumber(1),
          timestamp: new BigNumber(timestamp1),
          rawprice: new BigNumber(0.5),
          state: OracleRawPriceState.LIVE
        },
        {
          priceFeeds: { token: 'APPLE', currency: 'USD' },
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
          priceFeeds: { token: 'TESLA', currency: 'EUR' },
          oracleid: oracleid2,
          weightage: new BigNumber(2),
          timestamp: new BigNumber(timestamp2),
          rawprice: new BigNumber(1.5),
          state: OracleRawPriceState.LIVE
        },
        {
          priceFeeds: { token: 'TESLA', currency: 'USD' },
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

  it('should listLatestRawPrices if there are 2 oracles with different priceFeeds created', async () => {
    const oracleid1 = await container.call('appointoracle', [await container.getNewAddress(), [{ token: 'APPLE', currency: 'EUR' }], 1])
    const oracleid2 = await container.call('appointoracle', [await container.getNewAddress(), [{ token: 'TESLA', currency: 'USD' }], 2])

    await container.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    const prices = [{ tokenAmount: '0.5@APPLE', currency: 'EUR' }]
    await container.call('setoracledata', [oracleid1, timestamp, prices])

    await container.generate(1)

    // NOTE(jingyi2811): Pagination is not supported.
    const data = await client.oracle.listLatestRawPrices({ token: 'APPLE', currency: 'EUR' })

    expect(data).toStrictEqual(
      [{
        priceFeeds: { token: 'APPLE', currency: 'EUR' },
        oracleid: oracleid1,
        weightage: new BigNumber(1),
        timestamp: new BigNumber(timestamp),
        rawprice: new BigNumber(0.5),
        state: OracleRawPriceState.LIVE
      }])

    await container.call('removeoracle', [oracleid1])
    await container.call('removeoracle', [oracleid2])

    await container.generate(1)
  })

  it('should listLatestRawPrices with 4200 seconds after current time', async () => {
    const oracleid = await container.call('appointoracle', [await container.getNewAddress(), [{ token: 'APPLE', currency: 'EUR' }], 1])

    await container.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000) + 4200
    const prices = [{ tokenAmount: '0.5@APPLE', currency: 'EUR' }]
    await container.call('setoracledata', [oracleid, timestamp, prices])

    await container.generate(1)

    // NOTE(jingyi2811): Pagination is not supported.
    const data = await client.oracle.listLatestRawPrices()

    expect(data.length).toStrictEqual(1)

    expect(data).toStrictEqual(
      [{
        priceFeeds: { token: 'APPLE', currency: 'EUR' },
        oracleid: oracleid,
        weightage: new BigNumber(1),
        timestamp: new BigNumber(timestamp),
        rawprice: new BigNumber(0.5),
        state: OracleRawPriceState.EXPIRED
      }])

    await container.call('removeoracle', [oracleid])

    await container.generate(1)
  })

  it('should listLatestRawPrices with 4200 seconds before current time', async () => {
    const oracleid = await container.call('appointoracle', [await container.getNewAddress(), [{ token: 'APPLE', currency: 'EUR' }], 1])

    await container.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000) - 4200
    const prices = [{ tokenAmount: '0.5@APPLE', currency: 'EUR' }]
    await container.call('setoracledata', [oracleid, timestamp, prices])

    await container.generate(1)

    // NOTE(jingyi2811): Pagination is not supported.
    const data = await client.oracle.listLatestRawPrices()

    expect(data.length).toStrictEqual(1)

    expect(data).toStrictEqual(
      [{
        priceFeeds: { token: 'APPLE', currency: 'EUR' },
        oracleid: oracleid,
        weightage: new BigNumber(1),
        timestamp: new BigNumber(timestamp),
        rawprice: new BigNumber(0.5),
        state: OracleRawPriceState.EXPIRED
      }])

    await container.call('removeoracle', [oracleid])

    await container.generate(1)
  })

  it('should listLatestRawPrices with empty array if there is no oracle appointed', async () => {
    // NOTE(jingyi2811): Pagination is not supported.
    const data = await client.oracle.listLatestRawPrices()

    expect(data.length).toStrictEqual(0)
  })

  it('should listLatestRawPrices with priceFeed as input parameter', async () => {
    const oracleid = await container.call('appointoracle', [await container.getNewAddress(), [{ token: 'APPLE', currency: 'EUR' }], 1])

    await container.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    const prices = [{ tokenAmount: '0.5@APPLE', currency: 'EUR' }]
    await container.call('setoracledata', [oracleid, timestamp, prices])

    await container.generate(1)

    // NOTE(jingyi2811): Pagination is not supported.
    const data = await client.oracle.listLatestRawPrices({ token: 'APPLE', currency: 'EUR' })

    expect(data).toStrictEqual(
      [
        {
          priceFeeds: { token: 'APPLE', currency: 'EUR' },
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
