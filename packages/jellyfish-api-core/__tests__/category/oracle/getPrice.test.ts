import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'
import { RpcApiError } from '../../../src'

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

  it('should getPrice', async () => {
    const priceFeed = { token: 'APPLE', currency: 'EUR' }

    const oracleid1 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeed], 1])
    const oracleid2 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeed], 2])

    await container.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)

    const prices1 = [{ tokenAmount: '0.5@APPLE', currency: 'EUR' }]
    await container.call('setoracledata', [oracleid1, timestamp, prices1])

    const prices2 = [{ tokenAmount: '1.0@APPLE', currency: 'EUR' }]
    await container.call('setoracledata', [oracleid2, timestamp, prices2])

    await container.generate(1)

    const data = await client.oracle.getPrice(priceFeed)

    // NOTE(jingyi2811): 0.83333333 = (0.5 * 1 + 1.0 * 2) / 3
    expect(data.toString()).toStrictEqual(new BigNumber('0.83333333').toString())
  })

  it('should not getPrice if priceFeed does not exists', async () => {
    const priceFeed = { token: 'TESLA', currency: 'USD' }

    const promise = client.oracle.getPrice(priceFeed)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'no live oracles for specified request\', code: -1, method: getprice')
  })

  it('should not getPrice for oracles created 1 hour later or before', async () => {
    const priceFeed = { token: 'FB', currency: 'CNY' }

    const oracleid1 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeed], 1])
    const oracleid2 = await container.call('appointoracle', [await container.getNewAddress(), [priceFeed], 2])

    await container.generate(1)

    const timestamp1 = Math.floor(new Date().getTime() / 1000) + 4200
    const prices1 = [{ tokenAmount: '0.5@FB', currency: 'CNY' }]
    await container.call('setoracledata', [oracleid1, timestamp1, prices1])

    const timestamp2 = Math.floor(new Date().getTime() / 1000) - 4200
    const prices2 = [{ tokenAmount: '1.0@FB', currency: 'CNY' }]
    await container.call('setoracledata', [oracleid2, timestamp2, prices2])

    await container.generate(1)

    const promise = client.oracle.getPrice(priceFeed)

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'no live oracles for specified request\', code: -1, method: getprice')
  })
})
