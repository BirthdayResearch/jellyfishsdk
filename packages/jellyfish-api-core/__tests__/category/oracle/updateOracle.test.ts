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
    const appointOraclePriceFeed = [{ currency: 'USD', token: 'TESLA' }, { currency: 'EUR', token: 'APPLE' }]
    const oracleTxid = await container.call('appointoracle', [address, appointOraclePriceFeed, 1])

    await container.generate(1)

    let result = await container.call('getoracledata', [oracleTxid])
    expect(result.weightage).toStrictEqual(1)
    expect(result.priceFeeds).toStrictEqual([
      { token: 'APPLE', currency: 'EUR' },
      { token: 'TESLA', currency: 'USD' }
    ])

    await container.generate(1)

    // Update oracle
    const updateOraclePriceFeed = [{ currency: 'SGD', token: 'MSFT' }, { currency: 'CNY', token: 'FB' }]
    await client.oracle.updateOracle(oracleTxid, result.address, { priceFeeds: updateOraclePriceFeed, weightage: 2 })

    await container.generate(1)

    result = await container.call('getoracledata', [oracleTxid])
    expect(result.weightage).toStrictEqual(2)
    expect(result.priceFeeds).toStrictEqual([
      { token: 'FB', currency: 'CNY' },
      { token: 'MSFT', currency: 'SGD' }
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
    const appointOraclePriceFeed = [{ currency: 'USD', token: 'TESLA' }, { currency: 'EUR', token: 'APPLE' }]
    const oracleTxid = await container.call('appointoracle', [address, appointOraclePriceFeed, 1])

    await container.generate(1)

    let result = await container.call('getoracledata', [oracleTxid])
    expect(result.weightage).toStrictEqual(1)
    expect(result.priceFeeds).toStrictEqual([
      { token: 'APPLE', currency: 'EUR' },
      { token: 'TESLA', currency: 'USD' }
    ])

    await container.generate(1)

    // Update oracle
    const utxos = await container.call('listunspent', [1, 9999999, [address], true])
    const inputs: UTXO[] = utxos.map((utxo: UTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })

    const updateOraclePriceFeed = [{ currency: 'SGD', token: 'MSFT' }, { currency: 'CNY', token: 'FB' }]
    await client.oracle.updateOracle(oracleTxid, result.address, { priceFeeds: updateOraclePriceFeed, weightage: 2, utxos: inputs })

    await container.generate(1)

    result = await container.call('getoracledata', [oracleTxid])
    expect(result.weightage).toStrictEqual(2)
    expect(result.priceFeeds).toStrictEqual([
      { token: 'FB', currency: 'CNY' },
      { token: 'MSFT', currency: 'SGD' }
    ])
  })
})
