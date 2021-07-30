import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
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

  it('should updateOracle', async () => {
    // Appoint oracle
    const appointOraclePriceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), appointOraclePriceFeeds, 1])

    await container.generate(1)

    // Update oracle
    const updateOraclePriceFeeds = [
      { token: 'FB', currency: 'CNY' },
      { token: 'MSFT', currency: 'SGD' }
    ]

    await client.oracle.updateOracle(oracleId, await container.getNewAddress(), {
      priceFeeds: updateOraclePriceFeeds,
      weightage: 2
    })

    await container.generate(1)

    const data = await container.call('getoracledata', [oracleId])

    expect(data).toStrictEqual({
      weightage: 2,
      oracleId,
      address: expect.any(String),
      priceFeeds: updateOraclePriceFeeds,
      tokenPrices: []
    })
  })

  it('should not updateOracle if oracleId is invalid', async () => {
    const oracleId = '8430ac5711d78dc6f98591e144916d27f80952271c62cc15410f878d9b08300d'

    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    const promise = client.oracle.updateOracle(oracleId, await container.getNewAddress(), { priceFeeds, weightage: 1 })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`RpcApiError: 'Test UpdateOracleAppointTx execution failed:\noracle <${oracleId as string}> not found', code: -32600, method: updateoracle`)
  })

  it('should updateOracle using same tokens and currencies', async () => {
    // Appoint oracle
    const appointOraclePriceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), appointOraclePriceFeeds, 1])

    await container.generate(1)

    // Update oracle
    const updateOraclePriceFeeds = [
      { token: 'CNY', currency: 'FB' },
      { token: 'CNY', currency: 'FB' }
    ]

    await client.oracle.updateOracle(oracleId, await container.getNewAddress(), {
      priceFeeds: updateOraclePriceFeeds,
      weightage: 2
    })

    await container.generate(1)

    const data = await container.call('getoracledata', [oracleId])

    expect(data.priceFeeds).toStrictEqual([{ token: 'CNY', currency: 'FB' }])
  })

  it('should updateOracle using random tokens and currencies with 1 letter', async () => {
    // Appoint oracle
    const appointOraclePriceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), appointOraclePriceFeeds, 1])

    await container.generate(1)

    // Update oracle
    const updateOraclePriceFeeds = [
      { token: 'A', currency: 'C' },
      { token: 'B', currency: 'D' }
    ]

    await client.oracle.updateOracle(oracleId, await container.getNewAddress(), {
      priceFeeds: updateOraclePriceFeeds,
      weightage: 2
    })

    await container.generate(1)

    const data = await container.call('getoracledata', [oracleId])

    expect(data.priceFeeds).toStrictEqual(updateOraclePriceFeeds)
  })

  it('should updateOracle using random tokens and currencies with 15 letters', async () => {
    // Appoint oracle
    const appointOraclePriceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), appointOraclePriceFeeds, 1])

    await container.generate(1)

    // Update oracle
    const updateOraclePriceFeeds = [
      { token: '123456789012345', currency: '123456789012345' },
      { token: 'ABCDEFGHIJKLMNO', currency: 'ABCDEFGHIJKLMNO' }
    ]

    await client.oracle.updateOracle(oracleId, await container.getNewAddress(), {
      priceFeeds: updateOraclePriceFeeds,
      weightage: 2
    })

    await container.generate(1)

    const data = await container.call('getoracledata', [oracleId])

    expect(data.priceFeeds).toStrictEqual([
      { token: '12345678', currency: '12345678' },
      { token: 'ABCDEFGH', currency: 'ABCDEFGH' }
    ])
  })

  it('should updateOracle if weightage is 0', async () => {
    // Appoint oracle
    const appointOraclePriceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    let oracleId = await container.call('appointoracle', [await container.getNewAddress(), appointOraclePriceFeeds, 1])

    await container.generate(1)

    // Update oracle
    const updateOraclePriceFeeds = [
      { token: 'FB', currency: 'CNY' },
      { token: 'MSFT', currency: 'SGD' }
    ]

    oracleId = await client.oracle.updateOracle(oracleId, await container.getNewAddress(), {
      priceFeeds: updateOraclePriceFeeds,
      weightage: 0
    })

    await container.generate(1)

    expect(typeof oracleId).toStrictEqual('string')
    expect(oracleId.length).toStrictEqual(64)
  })

  it('should updateOracle if weightage is 255', async () => {
    // Appoint oracle
    const appointOraclePriceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    let oracleId = await container.call('appointoracle', [await container.getNewAddress(), appointOraclePriceFeeds, 1])

    await container.generate(1)

    // Update oracle
    const updateOraclePriceFeeds = [
      { token: 'FB', currency: 'CNY' },
      { token: 'MSFT', currency: 'SGD' }
    ]

    oracleId = await client.oracle.updateOracle(oracleId, await container.getNewAddress(), {
      priceFeeds: updateOraclePriceFeeds,
      weightage: 255
    })

    await container.generate(1)

    expect(typeof oracleId).toStrictEqual('string')
    expect(oracleId.length).toStrictEqual(64)
  })

  it('should not updateOracle if weightage is -1', async () => {
    // Appoint oracle
    const appointOraclePriceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), appointOraclePriceFeeds, 1])

    await container.generate(1)

    // Update oracle
    const updateOraclePriceFeeds = [
      { token: 'FB', currency: 'CNY' },
      { token: 'MSFT', currency: 'SGD' }
    ]

    const promise = client.oracle.updateOracle(oracleId, await container.getNewAddress(), {
      priceFeeds: updateOraclePriceFeeds,
      weightage: -1
    })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'the weightage value is out of bounds\', code: -25, method: updateoracle')
  })

  it('should not updateOracle if weightage is 256', async () => {
    // Appoint oracle
    const appointOraclePriceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), appointOraclePriceFeeds, 1])

    await container.generate(1)

    // Update oracle
    const updateOraclePriceFeeds = [
      { token: 'FB', currency: 'CNY' },
      { token: 'MSFT', currency: 'SGD' }
    ]

    const promise = client.oracle.updateOracle(oracleId, await container.getNewAddress(), {
      priceFeeds: updateOraclePriceFeeds,
      weightage: 256
    })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'the weightage value is out of bounds\', code: -25, method: updateoracle')
  })

  it('should not updateOracle with arbitrary utxos', async () => {
    // Appoint oracle
    const appointOraclePriceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), appointOraclePriceFeeds, 1])

    await container.generate(1)

    // Update oracle
    const updateOraclePriceFeeds = [
      { token: 'FB', currency: 'CNY' },
      { token: 'MSFT', currency: 'SGD' }
    ]

    const { txid, vout } = await container.fundAddress(await container.getNewAddress(), 10)
    const promise = client.oracle.updateOracle(oracleId, await container.getNewAddress(), {
      priceFeeds: updateOraclePriceFeeds,
      weightage: 2,
      utxos: [{ txid, vout }]
    })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test UpdateOracleAppointTx execution failed:\ntx not from foundation member\', code: -32600, method: updateoracle')
  })
})
