import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'

describe('Oracle', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
  })

  beforeAll(async () => {
    const priceFeeds1 = { token: 'AAPL', currency: 'EUR' }
    const priceFeeds2 = { token: 'TSLA', currency: 'USD' }
    const priceFeeds3 = { token: 'ABCD', currency: 'EUR' }
    const priceFeeds4 = { token: 'EFGH', currency: 'USD' }

    const oracleId1 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeeds1], 1])
    const oracleId2 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeeds1], 2])
    const oracleId3 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeeds2], 3])
    const oracleId4 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeeds2], 4])
    const oracleId5 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeeds3], 1])
    const oracleId6 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeeds3], 2])
    const oracleId7 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeeds4], 3])
    const oracleId8 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeeds4], 4])

    await container.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)

    const prices1 = [{ tokenAmount: '0.5@AAPL', currency: 'EUR' }]
    await container.call('setoracledata', [oracleId1, timestamp, prices1])

    const prices2 = [{ tokenAmount: '1.0@AAPL', currency: 'EUR' }]
    await container.call('setoracledata', [oracleId2, timestamp, prices2])

    const prices3 = [{ tokenAmount: '1.5@TSLA', currency: 'USD' }]
    await container.call('setoracledata', [oracleId3, timestamp, prices3])

    const prices4 = [{ tokenAmount: '2.0@TSLA', currency: 'USD' }]
    await container.call('setoracledata', [oracleId4, timestamp, prices4])

    const prices5 = [{ tokenAmount: '0.5@ABCD', currency: 'EUR' }]
    await container.call('setoracledata', [oracleId5, timestamp, prices5])

    const prices6 = [{ tokenAmount: '1.0@ABCD', currency: 'EUR' }]
    await container.call('setoracledata', [oracleId6, timestamp, prices6])

    const prices7 = [{ tokenAmount: '1.5@EFGH', currency: 'USD' }]
    await container.call('setoracledata', [oracleId7, timestamp, prices7])

    const prices8 = [{ tokenAmount: '2.0@EFGH', currency: 'USD' }]
    await container.call('setoracledata', [oracleId8, timestamp, prices8])

    await container.generate(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should throw an error if start index is greater than the number of prices available', async () => {
    await expect(client.oracle.listPrices(100, false, 1)).rejects.toThrow('start index greater than number of prices available')
  })

  it('should listPrices', async () => {
    const data = await client.oracle.listPrices()

    // NOTE(jingyi2811): 0.83333333000000 = (0.5 * 1 + 1 * 2) / 3
    // NOTE(jingyi2811): 1.78571428000000 = (1.5 * 3 + 2 * 4) / 7
    expect(data).toStrictEqual([
      { token: 'AAPL', currency: 'EUR', price: new BigNumber(0.83333333000000), ok: true },
      { token: 'ABCD', currency: 'EUR', price: new BigNumber(0.83333333000000), ok: true },
      { token: 'EFGH', currency: 'USD', price: new BigNumber(1.78571428000000), ok: true },
      { token: 'TSLA', currency: 'USD', price: new BigNumber(1.78571428000000), ok: true }
    ])

    await container.generate(1)
  })

  it('should list prices with a limit', async () => {
    const prices = await client.oracle.listPrices(0, false, 1)
    expect(prices.length).toStrictEqual(1)
    expect(prices).toStrictEqual([
      { token: 'ABCD', currency: 'EUR', price: new BigNumber(0.83333333000000), ok: true }
    ])
  })

  it('should list prices including start enabled', async () => {
    const prices1 = await client.oracle.listPrices(0, true, 100)
    expect(prices1.length).toStrictEqual(4)
    expect(prices1).toStrictEqual([
      { token: 'AAPL', currency: 'EUR', price: new BigNumber(0.83333333000000), ok: true },
      { token: 'ABCD', currency: 'EUR', price: new BigNumber(0.83333333000000), ok: true },
      { token: 'EFGH', currency: 'USD', price: new BigNumber(1.78571428000000), ok: true },
      { token: 'TSLA', currency: 'USD', price: new BigNumber(1.78571428000000), ok: true }
    ])
  })

  it('should list prices with including start disabled', async () => {
    const prices = await client.oracle.listPrices(0, false, 100)
    expect(prices.length).toStrictEqual(3)
    expect(prices).toStrictEqual([
      { token: 'ABCD', currency: 'EUR', price: new BigNumber(0.83333333000000), ok: true },
      { token: 'EFGH', currency: 'USD', price: new BigNumber(1.78571428000000), ok: true },
      { token: 'TSLA', currency: 'USD', price: new BigNumber(1.78571428000000), ok: true }
    ])
  })

  it('should list prices with a starting value and with including start enaled', async () => {
    const prices = await client.oracle.listPrices(1, true, 100)
    expect(prices.length).toStrictEqual(3)
    expect(prices).toStrictEqual([
      { token: 'ABCD', currency: 'EUR', price: new BigNumber(0.83333333000000), ok: true },
      { token: 'EFGH', currency: 'USD', price: new BigNumber(1.78571428000000), ok: true },
      { token: 'TSLA', currency: 'USD', price: new BigNumber(1.78571428000000), ok: true }
    ])
  })

  it('should list prices with a starting value and a limit', async () => {
    const prices = await client.oracle.listPrices(1, false, 2)
    expect(prices.length).toStrictEqual(2)
    expect(prices).toStrictEqual([
      { token: 'EFGH', currency: 'USD', price: new BigNumber(1.78571428000000), ok: true },
      { token: 'TSLA', currency: 'USD', price: new BigNumber(1.78571428000000), ok: true }
    ])
  })

  it.skip('should listPrices with error msg for price timestamps 4200 seconds before the current time', async () => {
    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), [{
      token: 'AAPL',
      currency: 'EUR'
    }], 1])

    await container.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000) - 4200
    const prices = [{ tokenAmount: '0.5@AAPL', currency: 'EUR' }]
    await container.call('setoracledata', [oracleId, timestamp, prices])

    await container.generate(1)

    const data = await client.oracle.listPrices()
    expect(data).toStrictEqual(
      [
        {
          token: 'AAPL',
          currency: 'EUR',
          ok: 'no live oracles for specified request'
        }
      ]
    )
  })
})
