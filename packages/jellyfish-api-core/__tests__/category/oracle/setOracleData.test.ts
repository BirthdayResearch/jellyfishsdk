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

  it('should setOracleData', async () => {
    const oldPriceFeeds = [
      { currency: 'USD', token: 'TESLA' }
    ]

    const oracleid = await container.call('appointoracle', [await container.getNewAddress(), oldPriceFeeds, 1])

    await container.generate(1)

    const price = [{ currency: 'USD', tokenAmount: `${0.5}@TESLA` }]

    await client.oracle.setOracleData(oracleid, new Date().getTime(), { price })

    await container.generate(1)

    const data = await container.call('getoracledata', [oracleid])

    expect(data).toStrictEqual(
      {
        weightage: 1,
        oracleid,
        address: expect.any(String),
        priceFeeds: [
          { token: 'TESLA', currency: 'USD' }
        ],
        tokenPrices: [
          {
            token: 'TESLA',
            currency: 'USD',
            amount: 0.5,
            timestamp: expect.any(Number)
          }
        ]
      }
    )
  })

  it('should not setOracleData if oracleid is invalid', async () => {
    const oracleid = 'e40775f8bb396cd3d94429843453e66e68b1c7625d99b0b4c505ab004506697b'

    const price = [{ currency: 'USD', tokenAmount: `${0.5}@TESLA` }]
    const promise = client.oracle.setOracleData(oracleid, new Date().getTime(), { price })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`RpcApiError: 'oracle <${oracleid as string}> not found', code: -32600, method: setoracledata`)
  })

  it('should not setOracleData if currency and token are not exists', async () => {
    const oldPriceFeeds = [
      { currency: 'USD', token: 'TESLA' }
    ]

    const oracleid = await container.call('appointoracle', [await container.getNewAddress(), oldPriceFeeds, 1])

    await container.generate(1)

    const price = [{ currency: 'EUR', tokenAmount: `${0.5}@APPLE` }]

    const promise = client.oracle.setOracleData(oracleid, new Date().getTime(), { price })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Test SetOracleDataTx execution failed:\ntoken <APPLE> - currency <EUR> is not allowed\', code: -32600, method: setoracledata')
  })

  it('should setOracleData with UTXOs', async () => {
    const address = await container.getNewAddress()

    const oldPriceFeeds = [
      { currency: 'USD', token: 'TESLA' }
    ]

    const oracleid = await container.call('appointoracle', [await container.getNewAddress(), oldPriceFeeds, 1])

    await container.generate(1)

    const price = [{ currency: 'USD', tokenAmount: `${0.5}@TESLA` }]

    const utxos = await container.call('listunspent', [1, 9999999, [address], true])
    const inputs: UTXO[] = utxos.map((utxo: UTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })

    await client.oracle.setOracleData(oracleid, new Date().getTime(), { price, utxos: inputs })

    await container.generate(1)

    const data = await container.call('getoracledata', [oracleid])

    expect(data).toStrictEqual(
      {
        weightage: 1,
        oracleid,
        address: expect.any(String),
        priceFeeds: [
          { token: 'TESLA', currency: 'USD' }
        ],
        tokenPrices: [
          {
            token: 'TESLA',
            currency: 'USD',
            amount: 0.5,
            timestamp: expect.any(Number)
          }
        ]
      }
    )
  })

  it('should not setOracleData with arbritary UTXOs', async () => {
    const oldPriceFeeds = [
      { currency: 'USD', token: 'TESLA' }
    ]

    const oracleid = await container.call('appointoracle', [await container.getNewAddress(), oldPriceFeeds, 1])

    await container.generate(1)

    const price = [{ currency: 'USD', tokenAmount: `${0.5}@TESLA` }]

    const { txid, vout } = await container.fundAddress(await container.getNewAddress(), 10)

    const promise = client.oracle.setOracleData(oracleid, new Date().getTime(), { price, utxos: [{ txid, vout }] })

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Test SetOracleDataTx execution failed:\ntx must have at least one input from account owner\', code: -32600, method: setoracledata')
  })
})
