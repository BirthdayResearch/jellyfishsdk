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

  it('should appointOracle', async () => {
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    const oracleId = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 1 })

    expect(typeof oracleId).toStrictEqual('string')
    expect(oracleId.length).toStrictEqual(64)

    await container.generate(1)

    const data = await container.call('getoracledata', [oracleId])

    expect(data).toStrictEqual(
      {
        weightage: 1,
        oracleid: oracleId,
        address: expect.any(String),
        priceFeeds,
        tokenPrices: []
      }
    )
  })

  it('should appointOracle using same tokens and currencies', async () => {
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'AAPL', currency: 'EUR' }
    ]

    const oracleId = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 1 })

    await container.generate(1)

    const result = await container.call('getoracledata', [oracleId])

    expect(result.priceFeeds).toStrictEqual([{ token: 'AAPL', currency: 'EUR' }]) // Only return 1 price feed
  })

  it('should appointOracle using random tokens and currencies with 1 letter', async () => {
    const priceFeeds = [
      { token: 'A', currency: 'C' },
      { token: 'B', currency: 'D' }
    ]

    const oracleId = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 1 })

    await container.generate(1)

    const result = await container.call('getoracledata', [oracleId])

    expect(result.priceFeeds).toStrictEqual(priceFeeds)
  })

  it('should appointOracle using random tokens and currencies with 15 letters', async () => {
    const priceFeeds = [
      { token: '123456789012345', currency: '123456789012345' },
      { token: 'ABCDEFGHIJKLMNO', currency: 'ABCDEFGHIJKLMNO' }
    ]

    const oracleId = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 1 })

    await container.generate(1)

    const result = await container.call('getoracledata', [oracleId])

    expect(result.priceFeeds).toStrictEqual([
      { token: '12345678', currency: '12345678' }, // Only return first 8 letters
      { token: 'ABCDEFGH', currency: 'ABCDEFGH' } // Only return first 8 letters
    ])
  })

  it('should appointOracle if weightage is 0', async () => {
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    const oracleId = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 0 })

    expect(typeof oracleId).toStrictEqual('string')
    expect(oracleId.length).toStrictEqual(64)

    await container.generate(1)
  })

  it('should appointOracle if weightage is 255', async () => {
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    const oracleId = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 255 })

    expect(typeof oracleId).toStrictEqual('string')
    expect(oracleId.length).toStrictEqual(64)

    await container.generate(1)
  })

  it('should not appointOracle if weightage is -1', async () => {
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    const promise = client.oracle.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: -1 })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'the weightage value is out of bounds\', code: -25, method: appointoracle')
  })

  it('should not appointOracle if weightage is 256', async () => {
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    const promise = client.oracle.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 256 })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'the weightage value is out of bounds\', code: -25, method: appointoracle')
  })

  it('should appointOracle with utxos', async () => {
    const address = await container.getNewAddress()

    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    const utxos = await container.call('listunspent', [1, 9999999, [address], true])
    const inputs: UTXO[] = utxos.map((utxo: UTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })

    const oracleId = await client.oracle.appointOracle(address, priceFeeds, { weightage: 1, utxos: inputs })

    expect(typeof oracleId).toStrictEqual('string')
    expect(oracleId.length).toStrictEqual(64)

    await container.generate(1)

    const result = await container.call('getoracledata', [oracleId])
    expect(result).toStrictEqual(
      {
        weightage: 1,
        oracleid: oracleId,
        address: expect.any(String),
        priceFeeds,
        tokenPrices: []
      }
    )
  })

  it('should not appointOracle with arbitrary utxos', async () => {
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' },
      { token: 'TSLA', currency: 'USD' }
    ]

    const { txid, vout } = await container.fundAddress(await container.getNewAddress(), 10)
    const promise = client.oracle.appointOracle(await container.getNewAddress(), priceFeeds, {
      weightage: 1,
      utxos: [{ txid, vout }]
    })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test AppointOracleTx execution failed:\ntx not from foundation member\', code: -32600, method: appointoracle')
  })
})
