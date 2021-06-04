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
    const address = await container.getNewAddress()

    // Appoint oracle
    const appointOraclePriceFeed = [
      { currency: 'USD', token: 'TESLA' },
      { currency: 'EUR', token: 'APPLE' }
    ]

    const oracleid = await container.call('appointoracle', [address, appointOraclePriceFeed, 1])

    await container.generate(1)

    // Update oracle
    const updateOraclePriceFeed = [
      { currency: 'CNY', token: 'FB' },
      { currency: 'SGD', token: 'MSFT' }
    ]

    await client.oracle.updateOracle(oracleid, address, { priceFeeds: updateOraclePriceFeed, weightage: 2 })

    await container.generate(1)

    const data = await container.call('getoracledata', [oracleid])

    expect(data.weightage).toStrictEqual(2)
    expect(data.priceFeeds).toStrictEqual(updateOraclePriceFeed)
  })

  it('should updateOracle using same tokens and currencies', async () => {
    const address = await container.getNewAddress()

    // Appoint oracle
    const appointOraclePriceFeed = [
      { currency: 'USD', token: 'TESLA' },
      { currency: 'EUR', token: 'APPLE' }
    ]

    const oracleid = await container.call('appointoracle', [address, appointOraclePriceFeed, 1])

    await container.generate(1)

    // Update oracle
    const updateOraclePriceFeed = [
      { currency: 'CNY', token: 'FB' },
      { currency: 'CNY', token: 'FB' }
    ]

    await client.oracle.updateOracle(oracleid, address, { priceFeeds: updateOraclePriceFeed, weightage: 2 })

    await container.generate(1)

    const data = await container.call('getoracledata', [oracleid])

    expect(data.weightage).toStrictEqual(2)
    expect(data.priceFeeds).toStrictEqual(
      [{ currency: 'CNY', token: 'FB' }]
    )
  })

  it('should updateOracle using random tokens and currencies with 1 letter', async () => {
    const address = await container.getNewAddress()

    // Appoint oracle
    const appointOraclePriceFeed = [
      { currency: 'USD', token: 'TESLA' },
      { currency: 'EUR', token: 'APPLE' }
    ]

    const oracleid = await container.call('appointoracle', [address, appointOraclePriceFeed, 1])

    await container.generate(1)

    // Update oracle
    const updateOraclePriceFeed = [
      { currency: 'A', token: 'C' },
      { currency: 'B', token: 'D' }
    ]

    await client.oracle.updateOracle(oracleid, address, { priceFeeds: updateOraclePriceFeed, weightage: 2 })

    await container.generate(1)

    const data = await container.call('getoracledata', [oracleid])

    expect(data.weightage).toStrictEqual(2)
    expect(data.priceFeeds).toStrictEqual(updateOraclePriceFeed)
  })

  it('should udpateOracle using random tokens and currencies with 15 letters', async () => {
    const address = await container.getNewAddress()

    // Appoint oracle
    const appointOraclePriceFeed = [
      { currency: 'USD', token: 'TESLA' },
      { currency: 'EUR', token: 'APPLE' }
    ]

    const oracleid = await container.call('appointoracle', [address, appointOraclePriceFeed, 1])

    await container.generate(1)

    // Update oracle
    const updateOraclePriceFeed = [
      { token: '123456789012345', currency: '123456789012345' },
      { token: 'ABCDEFGHIJKLMNO', currency: 'ABCDEFGHIJKLMNO' }
    ]

    await client.oracle.updateOracle(oracleid, address, { priceFeeds: updateOraclePriceFeed, weightage: 2 })

    await container.generate(1)

    const data = await container.call('getoracledata', [oracleid])

    expect(data.weightage).toStrictEqual(2)
    expect(data.priceFeeds).toStrictEqual([
      { token: '12345678', currency: '12345678' },
      { token: 'ABCDEFGH', currency: 'ABCDEFGH' }
    ])
  })

  it('should not updateOracle for invalid oracleid', async () => {
    const oracleid = '8430ac5711d78dc6f98591e144916d27f80952271c62cc15410f878d9b08300d'

    const priceFeeds = [{ currency: 'SGD', token: 'MSFT' }, { currency: 'CNY', token: 'FB' }]
    const promise = client.oracle.updateOracle(oracleid, await container.getNewAddress(), { priceFeeds, weightage: 2 })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`RpcApiError: 'Test UpdateOracleAppointTx execution failed:\noracle <${oracleid as string}> not found', code: -32600, method: updateoracle`)
  })

  it('should updateOracle with utxos', async () => {
    const address = await container.getNewAddress()

    // Appoint oracle
    const appointOraclePriceFeed = [
      { currency: 'USD', token: 'TESLA' },
      { currency: 'EUR', token: 'APPLE' }
    ]

    const oracleid = await container.call('appointoracle', [address, appointOraclePriceFeed, 1])

    await container.generate(1)

    // Update oracle
    const updateOraclePriceFeed = [
      { currency: 'CNY', token: 'FB' },
      { currency: 'SGD', token: 'MSFT' }
    ]

    const utxos = await container.call('listunspent', [1, 9999999, [address], true])
    const inputs: UTXO[] = utxos.map((utxo: UTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })

    await client.oracle.updateOracle(oracleid, address, {
      priceFeeds: updateOraclePriceFeed,
      weightage: 2,
      utxos: inputs
    })

    await container.generate(1)

    const data = await container.call('getoracledata', [oracleid])
    expect(data.weightage).toStrictEqual(2)
    expect(data.priceFeeds).toStrictEqual([
      { token: 'FB', currency: 'CNY' },
      { token: 'MSFT', currency: 'SGD' }
    ])
  })

  it('should not updateOracle with arbitrary utxos', async () => {
    const address = await container.getNewAddress()

    // Appoint oracle
    const appointOraclePriceFeed = [
      { currency: 'USD', token: 'TESLA' },
      { currency: 'EUR', token: 'APPLE' }
    ]

    const oracleid = await container.call('appointoracle', [address, appointOraclePriceFeed, 1])

    await container.generate(1)

    // Update oracle
    const updateOraclePriceFeed = [
      { currency: 'CNY', token: 'FB' },
      { currency: 'SGD', token: 'MSFT' }
    ]

    const { txid, vout } = await container.fundAddress(await container.getNewAddress(), 10)
    const promise = client.oracle.updateOracle(oracleid, address, {
      priceFeeds: updateOraclePriceFeed,
      weightage: 2,
      utxos: [{ txid, vout }]
    })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test UpdateOracleAppointTx execution failed:\ntx not from foundation member\', code: -32600, method: updateoracle')
  })
})
