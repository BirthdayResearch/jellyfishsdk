import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'

describe('Oracle', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeEach(async () => {
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

    await container.stop()
  })

  it('should listPrices', async () => {
    const priceFeeds1 = { token: 'APPLE', currency: 'EUR' }
    const priceFeeds2 = { token: 'TESLA', currency: 'USD' }

    const oracleid1 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeeds1], 1])
    const oracleid2 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeeds1], 2])
    const oracleid3 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeeds2], 3])
    const oracleid4 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeeds2], 4])

    await container.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)

    const prices1 = [{ tokenAmount: '0.5@APPLE', currency: 'EUR' }]
    await container.call('setoracledata', [oracleid1, timestamp, prices1])

    const prices2 = [{ tokenAmount: '1.0@APPLE', currency: 'EUR' }]
    await container.call('setoracledata', [oracleid2, timestamp, prices2])

    const prices3 = [{ tokenAmount: '1.5@TESLA', currency: 'USD' }]
    await container.call('setoracledata', [oracleid3, timestamp, prices3])

    const prices4 = [{ tokenAmount: '2.0@TESLA', currency: 'USD' }]
    await container.call('setoracledata', [oracleid4, timestamp, prices4])

    await container.generate(1)

    const data = await client.oracle.listPrices()

    // NOTE(jingyi2811): 0.83333333000000 = (0.5 * 1 + 1 * 2) / 3
    // NOTE(jingyi2811): 1.78571428000000 = (1.5 * 3 + 2 * 4) / 7
    expect(data).toStrictEqual([
      { token: 'APPLE', currency: 'EUR', price: new BigNumber(0.83333333000000), ok: true },
      { token: 'TESLA', currency: 'USD', price: new BigNumber(1.78571428000000), ok: true }
    ])

    await container.generate(1)
  })

  it('should listPrices with empty array if no oracle is appointed', async () => {
    const data = await client.oracle.listPrices()
    expect(data.length).toStrictEqual(0)
  })

  it('should listPrices with error msg for oracles created 1 hour later or before', async () => {
    const priceFeed = { token: 'APPLE', currency: 'EUR' }

    const oracleid1 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeed], 1])
    const oracleid2 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeed], 2])

    await container.generate(1)

    const timestamp1 = Math.floor(new Date().getTime() / 1000) + 3600
    const prices1 = [{ tokenAmount: '0.5@APPLE', currency: 'EUR' }]
    await container.call('setoracledata', [oracleid1, timestamp1, prices1])

    const timestamp2 = Math.floor(new Date().getTime() / 1000) - 3600
    const prices2 = [{ tokenAmount: '1@APPLE', currency: 'EUR' }]
    await container.call('setoracledata', [oracleid2, timestamp2, prices2])

    await container.generate(1)

    const data = await client.oracle.listPrices()
    expect(data).toStrictEqual(
      [
        {
          token: 'APPLE',
          currency: 'EUR',
          ok: 'no live oracles for specified request'
        }
      ]
    )
  })
})
