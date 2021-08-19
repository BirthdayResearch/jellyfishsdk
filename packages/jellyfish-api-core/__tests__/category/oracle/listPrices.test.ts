import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'

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

  it('should listPrices', async () => {
    const priceFeeds1 = { token: 'AAPL', currency: 'EUR' }
    const priceFeeds2 = { token: 'TSLA', currency: 'USD' }

    const oracleId1 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeeds1], 1])
    const oracleId2 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeeds1], 2])
    const oracleId3 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeeds2], 3])
    const oracleId4 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeeds2], 4])

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

    await container.generate(1)

    const data = await client.oracle.listPrices()

    // NOTE(jingyi2811): 0.83333333000000 = (0.5 * 1 + 1 * 2) / 3
    // NOTE(jingyi2811): 1.78571428000000 = (1.5 * 3 + 2 * 4) / 7
    expect(data).toStrictEqual([
      { token: 'AAPL', currency: 'EUR', price: new BigNumber(0.83333333000000), ok: true },
      { token: 'TSLA', currency: 'USD', price: new BigNumber(1.78571428000000), ok: true }
    ])

    await container.generate(1)
  })

  it('should listPrices with empty array if no oracle is appointed', async () => {
    const data = await client.oracle.listPrices()
    expect(data.length).toStrictEqual(0)
  })

  it('should listPrices with error msg for price timestamps 4200 seconds before the current time', async () => {
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
