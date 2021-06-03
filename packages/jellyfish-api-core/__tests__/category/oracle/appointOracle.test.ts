import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { UTXO } from '../../../src/category/oracle'
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

  it('should appointOracle', async () => {
    const priceFeeds = [
      { currency: 'USD', token: 'TESLA' },
      { currency: 'EUR', token: 'APPLE' }
    ]

    const txid = await client.oracle.appointOracle(await container.getNewAddress(), priceFeeds, { weightage: 1 })

    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)

    await container.generate(1)

    const result = await container.call('getoracledata', [txid])
    expect(result).toStrictEqual(
      {
        weightage: 1,
        oracleid: txid,
        address: expect.any(String),
        priceFeeds: [
          { token: 'APPLE', currency: 'EUR' },
          { token: 'TESLA', currency: 'USD' }
        ],
        tokenPrices: []
      }
    )
  })

  it('should appointOracle with utxos', async () => {
    const priceFeeds = [
      { currency: 'USD', token: 'TESLA' },
      { currency: 'EUR', token: 'APPLE' }
    ]

    const address = await container.getNewAddress()
    const utxos = await container.call('listunspent', [1, 9999999, [address], true])
    const inputs: UTXO[] = utxos.map((utxo: UTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })

    const txid = await client.oracle.appointOracle(address, priceFeeds, { weightage: 1, utxos: inputs })

    expect(typeof txid).toStrictEqual('string')
    expect(txid.length).toStrictEqual(64)

    await container.generate(1)

    const result = await container.call('getoracledata', [txid])
    expect(result).toStrictEqual(
      {
        weightage: 1,
        oracleid: txid,
        address: expect.any(String),
        priceFeeds: [
          { token: 'APPLE', currency: 'EUR' },
          { token: 'TESLA', currency: 'USD' }
        ],
        tokenPrices: []
      }
    )
  })

  it('should not appointOracle with arbitrary utxos', async () => {
    const priceFeeds = [
      { currency: 'USD', token: 'TESLA' },
      { currency: 'EUR', token: 'APPLE' }
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
