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
    const data = await container.call('listoracles')

    for (let i = 0; i < data.length; i += 1) {
      await container.call('removeoracle', [data[i]])
    }

    await container.generate(1)

    await container.stop()
  })

  it('should listOracles', async () => {
    const priceFeeds = [
      { token: 'APPLE', currency: 'EUR' },
      { token: 'TESLA', currency: 'USD' }
    ]

    const oracleid1 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])
    const oracleid2 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 2])

    await container.generate(1)

    // NOTE(jingyi2811): Pagination is not supported.
    const data = await client.oracle.listOracles()

    expect(data.length).toStrictEqual(2)
    expect(typeof data[0]).toStrictEqual('string')
    expect(data[0].length).toStrictEqual(64)
    expect(typeof data[1]).toStrictEqual('string')
    expect(data[1].length).toStrictEqual(64)

    await container.call('removeoracle', [oracleid1])
    await container.call('removeoracle', [oracleid2])

    await container.generate(1)
  })

  it('should listOracles with empty array if there is no oracle available', async () => {
    const data = await client.oracle.listOracles()
    expect(data.length).toStrictEqual(0)
  })
})
