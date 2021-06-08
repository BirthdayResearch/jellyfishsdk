import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { RpcApiError } from '../../../src'
import BigNumber from 'bignumber.js'

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

  it('should getPrice with different price and different weightage', async () => {
    const priceFeeds = [
      { token: 'APPLE', currency: 'EUR' }
    ]

    const oracleid1 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])
    const oracleid2 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 2])

    await container.generate(1)

    const bestBlockHash = await client.blockchain.getBestBlockHash()
    const block = await container.call('getblock', [bestBlockHash])

    const timestamp1 = block.time
    const prices1 = [{ tokenAmount: '0.5@APPLE', currency: 'EUR' }]
    await container.call('setoracledata', [oracleid1, timestamp1, prices1])

    const timestamp2 = block.time
    const prices2 = [{ tokenAmount: '1.0@APPLE', currency: 'EUR' }]
    await container.call('setoracledata', [oracleid2, timestamp2, prices2])

    await container.generate(1)

    const data = await client.oracle.getPrice(priceFeeds[0])
    expect(data.toString()).toStrictEqual(new BigNumber('0.83333333').toString()) // (0.5 * 1 + 1 * 2) / 3
  })

  it('should getPrice with different price and same weightage', async () => {
    const priceFeeds = [
      { token: 'TESLA', currency: 'USD' }
    ]

    const oracleid1 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])
    const oracleid2 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    const bestBlockHash = await client.blockchain.getBestBlockHash()
    const block = await container.call('getblock', [bestBlockHash])

    const timestamp1 = block.time
    const prices1 = [{ tokenAmount: '0.5@TESLA', currency: 'USD' }]
    await container.call('setoracledata', [oracleid1, timestamp1, prices1])

    const timestamp2 = block.time
    const prices2 = [{ tokenAmount: '1.0@TESLA', currency: 'USD' }]
    await container.call('setoracledata', [oracleid2, timestamp2, prices2])

    await container.generate(1)

    const data = await client.oracle.getPrice(priceFeeds[0])
    expect(data.toString()).toStrictEqual(new BigNumber('0.75').toString()) // (0.5 * 1 + 1 * 1) / 2
  })

  it('should getPrice with same price and different weightage', async () => {
    const priceFeeds = [
      { token: 'FB', currency: 'CNY' }
    ]

    const oracleid1 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])
    const oracleid2 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 2])

    await container.generate(1)

    const bestBlockHash = await client.blockchain.getBestBlockHash()
    const block = await container.call('getblock', [bestBlockHash])

    const timestamp1 = block.time
    const prices1 = [{ tokenAmount: '0.5@FB', currency: 'CNY' }]
    await container.call('setoracledata', [oracleid1, timestamp1, prices1])

    const timestamp2 = block.time
    const prices2 = [{ tokenAmount: '0.5@FB', currency: 'CNY' }]
    await container.call('setoracledata', [oracleid2, timestamp2, prices2])

    await container.generate(1)

    const data = await client.oracle.getPrice(priceFeeds[0])
    expect(data.toString()).toStrictEqual(new BigNumber('0.5').toString()) // (0.5 * 1 + 0.5 * 2) / 3
  })

  it('should getPrice with same price and same weightage', async () => {
    const priceFeeds = [
      { token: 'MSFT', currency: 'SGD' }
    ]

    const oracleid1 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])
    const oracleid2 = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])

    await container.generate(1)

    const bestBlockHash = await client.blockchain.getBestBlockHash()
    const block = await container.call('getblock', [bestBlockHash])

    const timestamp1 = block.time
    const prices1 = [{ tokenAmount: '0.5@MSFT', currency: 'SGD' }]
    await container.call('setoracledata', [oracleid1, timestamp1, prices1])

    const timestamp2 = block.time
    const prices2 = [{ tokenAmount: '0.5@MSFT', currency: 'SGD' }]
    await container.call('setoracledata', [oracleid2, timestamp2, prices2])

    await container.generate(1)

    const data = await client.oracle.getPrice(priceFeeds[0])
    expect(data.toString()).toStrictEqual(new BigNumber('0.5').toString()) // (0.5 * 1 + 0.5 * 1) / 2
  })

  it('should not getPrice if priceFeeds do not exists', async () => {
    const priceFeeds = [
      { token: 'NF', currency: 'MYR' }
    ]

    const promise = client.oracle.getPrice(priceFeeds[0])

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'no live oracles for specified request\', code: -1, method: getprice')
  })

  it('should not getPrice for invalid timestamp', async () => {
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

    const promise = client.oracle.getPrice(priceFeeds[0])

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'no live oracles for specified request\', code: -1, method: getprice')
  })
})
