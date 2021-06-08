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

  it('should listPrices', async () => {
    const priceFeeds1 = [
      { token: 'APPLE', currency: 'EUR' }
    ]

    const priceFeeds2 = [
      { token: 'TESLA', currency: 'USD' }
    ]

    const oracleid1 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds1, 1])
    const oracleid2 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds1, 2])
    const oracleid3 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds2, 3])
    const oracleid4 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds2, 4])

    await container.generate(1)

    const bestBlockHash = await client.blockchain.getBestBlockHash()
    const block = await container.call('getblock', [bestBlockHash])

    const timestamp1 = block.time
    const prices1 = [{ tokenAmount: '0.5@APPLE', currency: 'EUR' }]
    await container.call('setoracledata', [oracleid1, timestamp1, prices1])

    const timestamp2 = block.time
    const prices2 = [{ tokenAmount: '1.0@APPLE', currency: 'EUR' }]
    await container.call('setoracledata', [oracleid2, timestamp2, prices2])

    const timestamp3 = block.time
    const prices3 = [{ tokenAmount: '1.5@TESLA', currency: 'USD' }]
    await container.call('setoracledata', [oracleid3, timestamp3, prices3])

    const timestamp4 = block.time
    const prices4 = [{ tokenAmount: '2.0@TESLA', currency: 'USD' }]
    await container.call('setoracledata', [oracleid4, timestamp4, prices4])

    await container.generate(1)

    const data = await client.oracle.listPrices()

    expect(data).toStrictEqual(
      [{ token: 'APPLE', currency: 'EUR', price: 0.83333333, ok: true }, // price = (0.5 * 1 + 1 * 2) / 3
        { token: 'TESLA', currency: 'USD', price: 1.78571428, ok: true }] // price = (1.5 * 3 + 2 * 4) / 7
    )
  })

  it('should not listPrices if no oracle is appointed', async () => {
    const data = await client.oracle.listPrices()
    expect(data.length).toStrictEqual(0)
  })

  it('should listPrices for invalid timestamp', async () => {
    const priceFeeds = [
      { token: 'AMZ', currency: 'IND' }
    ]

    const oracleid = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    const bestBlockHash = await client.blockchain.getBestBlockHash()
    const block = await container.call('getblock', [bestBlockHash])

    const timestamp = block.time - 1000000000
    const prices = [{ tokenAmount: '0.5@AMZ', currency: 'IND' }]
    await container.call('setoracledata', [oracleid, timestamp, prices])

    await container.generate(1)

    const data = await client.oracle.listPrices()
    expect(data).toStrictEqual(
      [
        {
          token: 'AMZ',
          currency: 'IND',
          ok: 'no live oracles for specified request'
        }
      ]
    )
  })

  it('should listPrices if the total weightage = 0', async () => {
    const priceFeeds = [
      { token: 'AMZ', currency: 'IND' }
    ]

    const oracleid = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 0])

    await container.generate(1)

    const bestBlockHash = await client.blockchain.getBestBlockHash()
    const block = await container.call('getblock', [bestBlockHash])

    const timestamp = block.time - 1000000000
    const prices = [{ tokenAmount: '0.5@AMZ', currency: 'IND' }]
    await container.call('setoracledata', [oracleid, timestamp, prices])

    await container.generate(1)

    const data = await client.oracle.listPrices()
    expect(data).toStrictEqual(
      [
        {
          token: 'AMZ',
          currency: 'IND',
          ok: 'no live oracles for specified request'
        }
      ]
    )
  })
})
