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
    const oracleId1 = await container.call('appointoracle', [await container.getNewAddress(), [{ token: 'AAPL', currency: 'EUR' }], 1])
    const oracleId2 = await container.call('appointoracle', [await container.getNewAddress(), [{ token: 'AAPL', currency: 'EUR' }], 2])

    await container.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)

    const prices1 = [{ tokenAmount: '0.5@AAPL', currency: 'EUR' }]
    await container.call('setoracledata', [oracleId1, timestamp, prices1])

    const prices2 = [{ tokenAmount: '1.0@AAPL', currency: 'EUR' }]
    await container.call('setoracledata', [oracleId2, timestamp, prices2])

    await container.generate(1)

    const data = await client.oracle.getPrice({ token: 'AAPL', currency: 'EUR' })

    // NOTE(jingyi2811): 0.83333333 = (0.5 * 1 + 1.0 * 2) / 3
    expect(data.toString()).toStrictEqual(new BigNumber('0.83333333').toString())
  })

  it('should not getPrice for price timestamps 4200 seconds before the current time', async () => {
    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), [{ token: 'FB', currency: 'CNY' }], 1])

    await container.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000) - 4200
    const prices = [{ tokenAmount: '0.5@FB', currency: 'CNY' }]
    await container.call('setoracledata', [oracleId, timestamp, prices])

    await container.generate(1)

    const promise = client.oracle.getPrice({ token: 'FB', currency: 'CNY' })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'no live oracles for specified request\', code: -1, method: getprice')
  })

  it('should not getPrice if priceFeed does not exists', async () => {
    const promise = client.oracle.getPrice({ token: 'MSFT', currency: 'SGD' })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'no live oracles for specified request\', code: -1, method: getprice')
  })
})
