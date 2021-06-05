import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { RpcApiError } from '../../../src'
import { UTXO } from '../../../src/category/oracle'

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
      { token: 'APPLE', currency: 'EUR' },
      { token: 'TESLA', currency: 'USD' }
    ]

    const oracleid = await container.call('appointoracle', [await container.getNewAddress(), appointOraclePriceFeeds, 1])

    await container.generate(1)

    // Update oracle
    const updateOraclePriceFeeds = [
      { token: 'FB', currency: 'CNY' },
      { token: 'MSFT', currency: 'SGD' }
    ]

    await client.oracle.updateOracle(oracleid, await container.getNewAddress(), {
      priceFeeds: updateOraclePriceFeeds,
      weightage: 2
    })

    await container.generate(1)

    const data = await container.call('getoracledata', [oracleid])

    expect(data).toStrictEqual({
      weightage: 2,
      oracleid,
      address: expect.any(String),
      priceFeeds: updateOraclePriceFeeds,
      tokenPrices: []
    })
  })

  it('should not updateOracle for invalid oracleid', async () => {
    const oracleid = '8430ac5711d78dc6f98591e144916d27f80952271c62cc15410f878d9b08300d'

    const priceFeeds = [
      { token: 'APPLE', currency: 'EUR' },
      { token: 'TESLA', currency: 'USD' }
    ]

    const promise = client.oracle.updateOracle(oracleid, await container.getNewAddress(), { priceFeeds, weightage: 1 })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`RpcApiError: 'Test UpdateOracleAppointTx execution failed:\noracle <${oracleid as string}> not found', code: -32600, method: updateoracle`)
  })

  it('should updateOracle using same tokens and currencies', async () => {
    // Appoint oracle
    const appointOraclePriceFeeds = [
      { token: 'APPLE', currency: 'EUR' },
      { token: 'TESLA', currency: 'USD' }
    ]

    const oracleid = await container.call('appointoracle', [await container.getNewAddress(), appointOraclePriceFeeds, 1])

    await container.generate(1)

    // Update oracle
    const updateOraclePriceFeeds = [
      { token: 'CNY', currency: 'FB' },
      { token: 'CNY', currency: 'FB' }
    ]

    await client.oracle.updateOracle(oracleid, await container.getNewAddress(), {
      priceFeeds: updateOraclePriceFeeds,
      weightage: 2
    })

    await container.generate(1)

    const data = await container.call('getoracledata', [oracleid])

    expect(data.priceFeeds).toStrictEqual([{ token: 'CNY', currency: 'FB' }])
  })

  it('should updateOracle using random tokens and currencies with 1 letter', async () => {
    // Appoint oracle
    const appointOraclePriceFeeds = [
      { token: 'APPLE', currency: 'EUR' },
      { token: 'TESLA', currency: 'USD' }
    ]

    const oracleid = await container.call('appointoracle', [await container.getNewAddress(), appointOraclePriceFeeds, 1])

    await container.generate(1)

    // Update oracle
    const updateOraclePriceFeeds = [
      { token: 'A', currency: 'C' },
      { token: 'B', currency: 'D' }
    ]

    await client.oracle.updateOracle(oracleid, await container.getNewAddress(), {
      priceFeeds: updateOraclePriceFeeds,
      weightage: 2
    })

    await container.generate(1)

    const data = await container.call('getoracledata', [oracleid])

    expect(data.priceFeeds).toStrictEqual(updateOraclePriceFeeds)
  })

  it('should updateOracle using random tokens and currencies with 15 letters', async () => {
    // Appoint oracle
    const appointOraclePriceFeeds = [
      { token: 'APPLE', currency: 'EUR' },
      { token: 'TESLA', currency: 'USD' }
    ]

    const oracleid = await container.call('appointoracle', [await container.getNewAddress(), appointOraclePriceFeeds, 1])

    await container.generate(1)

    // Update oracle
    const updateOraclePriceFeeds = [
      { token: '123456789012345', currency: '123456789012345' },
      { token: 'ABCDEFGHIJKLMNO', currency: 'ABCDEFGHIJKLMNO' }
    ]

    await client.oracle.updateOracle(oracleid, await container.getNewAddress(), {
      priceFeeds: updateOraclePriceFeeds,
      weightage: 2
    })

    await container.generate(1)

    const data = await container.call('getoracledata', [oracleid])

    expect(data.priceFeeds).toStrictEqual([
      { token: '12345678', currency: '12345678' },
      { token: 'ABCDEFGH', currency: 'ABCDEFGH' }
    ])
  })

  it('should updateOracle with utxos', async () => {
    // Appoint oracle
    const appointOraclePriceFeeds = [
      { token: 'APPLE', currency: 'EUR' },
      { token: 'TESLA', currency: 'USD' }
    ]

    const oracleid = await container.call('appointoracle', [await container.getNewAddress(), appointOraclePriceFeeds, 1])

    await container.generate(1)

    // Update oracle
    const updateOraclePriceFeeds = [
      { token: 'FB', currency: 'CNY' },
      { token: 'MSFT', currency: 'SGD' }
    ]

    const utxos = await container.call('listunspent', [1, 9999999, [await container.getNewAddress()], true])
    const inputs: UTXO[] = utxos.map((utxo: UTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })

    await client.oracle.updateOracle(oracleid, await container.getNewAddress(), {
      priceFeeds: updateOraclePriceFeeds,
      weightage: 2,
      utxos: inputs
    })

    await container.generate(1)

    const data = await container.call('getoracledata', [oracleid])

    expect(data).toStrictEqual({
      weightage: 2,
      oracleid,
      address: expect.any(String),
      priceFeeds: updateOraclePriceFeeds,
      tokenPrices: []
    })
  })

  it('should not updateOracle with arbitrary utxos', async () => {
    // Appoint oracle
    const address = await container.getNewAddress()

    const appointOraclePriceFeeds = [
      { token: 'APPLE', currency: 'EUR' },
      { token: 'TESLA', currency: 'USD' }
    ]

    const oracleid = await container.call('appointoracle', [address, appointOraclePriceFeeds, 1])

    await container.generate(1)

    // Update oracle
    const updateOraclePriceFeeds = [
      { token: 'FB', currency: 'CNY' },
      { token: 'MSFT', currency: 'SGD' }
    ]

    const { txid, vout } = await container.fundAddress(await container.getNewAddress(), 10)
    const promise = client.oracle.updateOracle(oracleid, address, {
      priceFeeds: updateOraclePriceFeeds,
      weightage: 2,
      utxos: [{ txid, vout }]
    })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test UpdateOracleAppointTx execution failed:\ntx not from foundation member\', code: -32600, method: updateoracle')
  })
})
